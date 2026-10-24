#!/usr/bin/env tsx
// ============================================================================
// QBase — the compliance engines must agree
// ---------------------------------------------------------------------------
// The compliance model is implemented TWICE, on purpose:
//
//   * `src/lib/compliancePeriods.ts` — the engine the pages read when the
//     server does not have the RPC (or for the parts that are pure
//     presentation);
//   * `public.compliance_map(...)`  — the engine the SERVER runs, so the
//     verdict comes from the server's view of the register and not from a
//     snapshot the browser happens to hold.
//
// Two implementations of one model is a liability, not a feature: they drift
// and then the dashboard says "5 overdue" while the audit page says "8".
// This script is the check that stops the drift: it runs BOTH engines over
// the WHOLE local register at one fixed instant and compares them field by
// field.  Any difference is a failure, and the difference is printed.
//
//   usage: npx tsx tools/local-stack/verify-compliance-parity.ts
//
// It reads the local database only (127.0.0.1:5433/qbase_local) and writes
// nothing.
// ============================================================================

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CANONICAL_FORMS } from '../../src/data/formCatalog';
import { buildComplianceMap, type FormCompliance } from '../../src/lib/compliance';
import { getRecordMonth } from '../../src/lib/temporalUtils';
import type { RecordData } from '../../src/components/forms/DynamicFormRenderer';

// ── the local database ───────────────────────────────────────────────────────
const PGHOST = process.env.QBASE_PGHOST || '127.0.0.1';
const PGPORT = process.env.QBASE_PGPORT || '5433';
const PGUSER = process.env.QBASE_PGUSER || 'postgres';
const PGDATABASE = process.env.QBASE_LOCAL_DB || 'qbase_local';

function psql(sql: string): string {
  return execFileSync(
    'psql',
    ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-tA', '-c', sql],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).trim();
}

// ── the instant both engines are asked about ─────────────────────────────────
// A fixed instant, so the run is reproducible: the answer may change from
// day to day, but the two engines must change together.
const AS_OF = new Date(process.env.QBASE_PARITY_AS_OF || '2026-10-24T12:00:00Z');
// The engine's calendar is the CALLER's calendar, so the server is told
// which one to use.
const TZ_OFFSET_MINUTES = -AS_OF.getTimezoneOffset();

// ── the register, as the client sees it ──────────────────────────────────────
interface DbRecord {
  form_code: string;
  created_at: string;
  form_data: Record<string, unknown>;
}

const recordsJson = psql(`
  select coalesce(json_agg(json_build_object(
    'form_code', form_code,
    'created_at', created_at,
    'form_data', form_data
  )), '[]'::json)
  from public.records
  where deleted_at is null;
`);

const dbRecords: DbRecord[] = JSON.parse(recordsJson);

// The client parses a row into a record: the business fields are FLATTENED
// onto the top level, which is where getRecordMonth() reads them from.
const clientRecords: RecordData[] = dbRecords.map((r) => ({
  ...(r.form_data as Record<string, unknown>),
  formCode: r.form_code,
  _createdAt: r.created_at,
} as unknown as RecordData));

// ── the two engines ──────────────────────────────────────────────────────────
const catalogue = CANONICAL_FORMS.map((f) => ({ code: f.code, name: f.name, frequency: f.frequency }));

const clientMap: Map<string, FormCompliance> = buildComplianceMap(
  clientRecords.map((r) => ({
    formCode: String(r.formCode),
    createdAt: String(r._createdAt || ''),
    month: getRecordMonth(r),
  })),
  catalogue,
  AS_OF,
);

const work = mkdtempSync(join(tmpdir(), 'qbase-parity-'));
const formsFile = join(work, 'forms.json');
writeFileSync(formsFile, JSON.stringify(catalogue), 'utf8');

const sqlFile = join(work, 'map.sql');
writeFileSync(
  sqlFile,
  `select public.compliance_map(
     (select pg_read_file('${formsFile}')::jsonb),
     '${AS_OF.toISOString()}'::timestamptz,
     ${TZ_OFFSET_MINUTES}
   );\n`,
  'utf8',
);

const serverPayload = JSON.parse(
  execFileSync(
    'psql',
    ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-tA', '-f', sqlFile],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).trim(),
);

const serverForms = serverPayload.forms as Record<string, Record<string, unknown>>;

// ── the comparison ───────────────────────────────────────────────────────────
const differences: string[] = [];

const compare = (code: string, field: string, client: unknown, server: unknown) => {
  const a = JSON.stringify(client ?? null);
  const b = JSON.stringify(server ?? null);
  if (a !== b) differences.push(`${code}.${field}: client ${a} != server ${b}`);
};

for (const form of catalogue) {
  const client = clientMap.get(form.code);
  const server = serverForms[form.code];
  if (!client || !server) {
    differences.push(`${form.code}: missing on the ${!client ? 'client' : 'server'} side`);
    continue;
  }

  compare(form.code, 'recordCount', client.recordCount, server.recordCount);
  compare(form.code, 'isOverdue', client.isOverdue, server.isOverdue);
  compare(form.code, 'overdueDays', client.overdueDays, server.overdueDays);
  compare(form.code, 'missingCount', client.missingCount, server.missingCount);
  compare(form.code, 'nextDueDate', client.nextDueDate, server.nextDueDate);
  compare(form.code, 'daysUntilDue', client.daysUntilDue, server.daysUntilDue);
  compare(form.code, 'daysSinceLast', client.daysSinceLast, server.daysSinceLast);
  compare(form.code, 'coveredCount', client.coveredCount, server.coveredCount);
  compare(form.code, 'isPeriodic', client.isPeriodic, server.periodic !== null);

  const clientMissing = client.missingPeriods.map((p) => p.key);
  const serverMissing = ((server.missingPeriods as Array<{ key: string }>) || []).map((p) => p.key);
  compare(form.code, 'missingPeriods', clientMissing, serverMissing);

  const clientStates = client.periodStates.map((s) => `${s.period.key}:${s.state}:${s.daysLate}`);
  const serverStates = ((server.periodStates as Array<{ key: string; state: string; daysLate: number }>) || [])
    .map((s) => `${s.key}:${s.state}:${s.daysLate}`);
  compare(form.code, 'periodStates', clientStates, serverStates);
}

// ── the report ───────────────────────────────────────────────────────────────
console.log(`as of        : ${AS_OF.toISOString()} (UTC offset ${TZ_OFFSET_MINUTES} minutes)`);
console.log(`records     : ${dbRecords.length}`);
console.log(`forms       : ${catalogue.length}`);
console.log(`dataset start: ${serverPayload.datasetStart}`);
console.log(`total records (server): ${serverPayload.totalRecords}`);

const overdue = catalogue.filter((f) => clientMap.get(f.code)?.isOverdue);
console.log(`overdue forms (both)  : ${overdue.length} — ${overdue.map((f) => f.code).join(', ')}`);

if (differences.length === 0) {
  console.log('\nPARITY: the two engines agree on every field of every form.');
  process.exit(0);
}

console.log(`\nPARITY: ${differences.length} difference(s):`);
for (const d of differences.slice(0, 60)) console.log('  - ' + d);
if (differences.length > 60) console.log(`  … and ${differences.length - 60} more`);
process.exit(1);
