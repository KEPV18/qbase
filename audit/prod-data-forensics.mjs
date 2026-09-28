#!/usr/bin/env node
// ============================================================================
// audit/prod-data-forensics.mjs — Phase 3 evidence collection, READ-ONLY.
//
// WHY THIS EXISTS
//   Phase 3 asks what the *intended* approval/records design is, and forbids
//   deciding it by assumption. Code and migrations disagree with each other,
//   so the tie-breaker is the data production actually holds: which statuses
//   are in use, whether anything ever recorded an approval decision, whether
//   serials are unique, and whether approval-shaped state is living inside
//   form_data rather than in a column.
//
// SAFETY
//   GET only. No INSERT/UPDATE/DELETE, no DDL, no RPC call, no storage write.
//   Aggregates are computed locally; the script prints counts and distinct
//   values only. It never prints a credential, an email address or a name.
//   Credentials are parsed in-process from the operator env file so they never
//   reach a command line or this script's output.
//
// Usage: node audit/prod-data-forensics.mjs
// Writes: audit/prod-data-forensics.json
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const envFile = join(homedir(), '.config', 'qbase', 'backup.env');
const env = { ...process.env };
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
}
const URL_ = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Nothing read.');
  process.exit(1);
}
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' };
console.log('credentials loaded from operator env file (values not printed)');

// ---------------------------------------------------------------------------
// Read helper. Paged GET; never a mutating verb.
// ---------------------------------------------------------------------------
async function page(path, { pageSize = 1000, max = 100 } = {}) {
  const rows = [];
  for (let i = 0; i < max; i += 1) {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { ...HEAD, Range: `${i * pageSize}-${i * pageSize + pageSize - 1}`, 'Range-Unit': 'items' },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GET ${path} -> ${res.status} ${t.slice(0, 200)}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

const tally = (rows, key) => {
  const m = {};
  for (const r of rows) {
    const v = r[key] === null || r[key] === undefined ? '<null>' : String(r[key]);
    m[v] = (m[v] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};

const out = { readAt: new Date().toISOString(), readOnly: true, errors: [] };

// A column that does not exist must be reported, not allowed to abort the whole
// forensic read — production's actual columns are what this script is here to
// discover, so a 42703 is a finding, not a crash.
async function section(label, fn) {
  try {
    return await fn();
  } catch (e) {
    out.errors.push({ section: label, error: String(e.message).slice(0, 300) });
    console.log(`SECTION FAILED: ${label} -> ${String(e.message).slice(0, 200)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. records — the status question, in full
// ---------------------------------------------------------------------------
const records = await page(
  'records?select=id,form_code,form_name,status,serial,section,section_name,frequency,project_id,edit_count,modification_reason,created_at,updated_at,deleted_at,created_by,last_modified_by',
);
out.records = {
  totalRows: records.length,
  status: tally(records, 'status'),
  form_code: tally(records, 'form_code'),
  section_name: tally(records, 'section_name'),
  frequency: tally(records, 'frequency'),
  edit_count: tally(records, 'edit_count'),
  has_modification_reason: records.filter((r) => r.modification_reason).length,
  is_soft_deleted: records.filter((r) => r.deleted_at).length,
  project_id_populated: records.filter((r) => r.project_id).length,
  created_by_populated: records.filter((r) => r.created_by).length,
  last_modified_by_populated: records.filter((r) => r.last_modified_by).length,
};

// serial integrity — matters because backupService restores with onConflict:'serial'
const serials = records.map((r) => r.serial);
const serialNulls = serials.filter((s) => s === null || s === undefined || s === '').length;
const serialDupes = Object.entries(tally(records, 'serial')).filter(([k, v]) => k !== '<null>' && v > 1);
out.serial = { distinct: new Set(serials).size, null_or_empty: serialNulls, duplicate_values: serialDupes };

// ---------------------------------------------------------------------------
// 2. form_data — is approval-shaped state hiding inside the JSON payload?
// ---------------------------------------------------------------------------
const withData = await page('records?select=id,form_code,form_data');
const keyFreq = {};
const approvalish = {};
const APPROVAL_RE = /approv|reject|sign|review|verif|authoris|authoriz|endors|draft|pending|status/i;
for (const r of withData) {
  const fd = r.form_data;
  if (!fd || typeof fd !== 'object') continue;
  for (const k of Object.keys(fd)) {
    keyFreq[k] = (keyFreq[k] || 0) + 1;
    if (APPROVAL_RE.test(k)) {
      const v = fd[k];
      const s = v === null || v === undefined ? '<null>' : typeof v === 'object' ? `<${Array.isArray(v) ? 'array' : 'object'}>` : String(v);
      approvalish[k] = approvalish[k] || {};
      approvalish[k][s] = (approvalish[k][s] || 0) + 1;
    }
  }
}
out.form_data_keys = Object.fromEntries(Object.entries(keyFreq).sort((a, b) => b[1] - a[1]));
out.form_data_approval_shaped = approvalish;

// ---------------------------------------------------------------------------
// 3. audit_log — did an approval decision EVER get recorded?
// ---------------------------------------------------------------------------
const audit = await page('audit_log?select=action,action_type,form_code,created_at,performed_by,changed_fields');
const actions = tally(audit, 'action');
const approvalActions = Object.fromEntries(Object.entries(actions).filter(([k]) => APPROVAL_RE.test(k)));
out.audit_log = {
  totalRows: audit.length,
  actions,
  approval_shaped_actions: approvalActions,
  earliest: audit.map((a) => a.created_at).sort()[0] ?? null,
  latest: audit.map((a) => a.created_at).sort().at(-1) ?? null,
  distinct_actors: new Set(audit.map((a) => a.performed_by).filter(Boolean)).size,
};

// ---------------------------------------------------------------------------
// 4. people / departments — where department actually lives
// ---------------------------------------------------------------------------
// NOTE: profiles has NO `role` column in production — an initial read selecting
// profiles.role returned 42703 "column profiles.role does not exist". Roles live
// only in user_roles. Column lists below are the OpenAPI-verified ones.
const profiles = await section('profiles', () => page('profiles?select=department,is_active'));
out.profiles = profiles && { totalRows: profiles.length, department: tally(profiles, 'department'), is_active: tally(profiles, 'is_active') };
const userRoles = await section('user_roles', () => page('user_roles?select=role,department'));
out.user_roles = userRoles && { totalRows: userRoles.length, role: tally(userRoles, 'role'), department: tally(userRoles, 'department') };
// audit_log carries action_type and user_email beyond what the audit migration defines
out.audit_log.action_type = tally(audit, 'action_type');

// ---------------------------------------------------------------------------
// 5. objects the code references that production should not have
// ---------------------------------------------------------------------------
for (const t of ['record_versions', 'projects', 'swot_items', 'swot_strategies', 'tenant_settings']) {
  try {
    const rows = await page(`${t}?select=*`, { pageSize: 1, max: 1 });
    out[`table_${t}`] = { present: true, sampled: rows.length };
  } catch (e) {
    out[`table_${t}`] = { present: false, error: String(e.message).slice(0, 120) };
  }
}

const OUT = join(process.cwd(), 'audit', 'prod-data-forensics.json');
writeFileSync(OUT, JSON.stringify(out, null, 2));

console.log('\n=== records.status ===');
console.log(JSON.stringify(out.records.status));
console.log(`records: ${out.records.totalRows} rows, soft-deleted ${out.records.is_soft_deleted}, project_id set ${out.records.project_id_populated}`);
console.log(`serial: ${out.serial.distinct} distinct, ${out.serial.null_or_empty} null/empty, duplicates ${JSON.stringify(out.serial.duplicate_values)}`);
console.log('\n=== audit_log actions ===');
console.log(JSON.stringify(out.audit_log.actions));
console.log(`approval-shaped actions: ${JSON.stringify(out.audit_log.approval_shaped_actions)}`);
console.log(`audit span ${out.audit_log.earliest} .. ${out.audit_log.latest}, ${out.audit_log.distinct_actors} distinct actors`);
console.log('\n=== department lives where ===');
console.log(`profiles.department   ${JSON.stringify(out.profiles.department)}`);
console.log(`user_roles.department ${JSON.stringify(out.user_roles.department)}`);
console.log('\n=== approval-shaped keys inside form_data ===');
console.log(JSON.stringify(out.form_data_approval_shaped, null, 2));
console.log('\n=== referenced-but-maybe-absent tables ===');
for (const t of ['record_versions', 'projects', 'swot_items', 'swot_strategies', 'tenant_settings']) {
  console.log(`  ${t.padEnd(18)} present=${out[`table_${t}`].present}`);
}
console.log(`\nwritten: ${OUT}`);
