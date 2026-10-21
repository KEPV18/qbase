#!/usr/bin/env tsx
// ============================================================================
// QBase — schema parity verifier
//
// Answers one question: does the DATABASE the app talks to match the code?
//
// It compares three independent sources and reports where they disagree:
//
//   A. CODE      → the tables and RPCs the deployed source actually names
//   B. SNAPSHOT  → audit/rpc-args.json, a read-only capture of the production
//                  PostgREST OpenAPI document (table columns + RPC signatures)
//   C. MIGRATIONS → supabase/migrations/**.sql, the versioned, reversible
//                  record of what the schema should be
//
// Rules this script obeys, and why:
//
//   * A TypeScript type is NOT evidence of a schema. `types.ts` is generated
//     and was already caught drifting from production, so it is never used
//     as the authority here.
//
//   * A successful `select('*')` is NOT parity either — it says the table
//     exists, not that its columns or its RPCs are what the code expects.
//
//   * The snapshot is dated. RPCs added by later migrations legitimately
//     appear in the migrations but not in the snapshot, so that direction is
//     a WARNING, never an error. The opposite direction — code calling an
//     RPC the snapshot says does not exist, and no migration creates it — is
//     an ERROR: there is no such function in production and no migration to
//     create it, so a fresh database would be missing it.
//
// Exit code is 0 when there are no ERROR findings, 1 otherwise.
// ============================================================================

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, 'src');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const SNAPSHOT = join(ROOT, 'audit', 'rpc-args.json');
const REPORT = join(ROOT, 'audit', 'schema-parity-report.json');

// ---------------------------------------------------------------------------
// Severity model
// ---------------------------------------------------------------------------
type Severity = 'ERROR' | 'WARNING';

interface Finding {
  severity: Severity;
  code: string;
  subject: string;
  detail: string;
  evidence: string;
}

const findings: Finding[] = [];

const add = (severity: Severity, code: string, subject: string, detail: string, evidence: string) => {
  findings.push({ severity, code, subject, detail, evidence });
};

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Every `.ts`/`.tsx` file under src/ (tests excluded — they are not shipped). */
function sourceFiles(): string[] {
  return walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
}

/**
 * Collect the table and RPC names the code names.
 *
 * Both `.from('x')` and `.rpc('x', {...})` are matched, along with the
 * double-quoted variant, because the codebase uses both.
 */
function scanCode(): { tables: Map<string, string[]>; rpcs: Map<string, Map<string, string[]>> } {
  const tables = new Map<string, string[]>();
  const rpcs = new Map<string, Map<string, string[]>>();

  const note = (map: Map<string, string[]>, key: string, file: string) => {
    if (!map.has(key)) map.set(key, []);
    const list = map.get(key)!;
    if (!list.includes(file)) list.push(file);
  };

  for (const file of sourceFiles()) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);

    // ── Tables ──
    // Case-insensitive: Postgres folds unquoted identifiers to lower case, so
    // `.from("Records")` and `.from("records")` reach the same relation. The
    // scanner must model that, or a mixed-case call would slip past the
    // comparison against the snapshot's lower-case table names.
    const tableRe = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]/gi;
    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(src)) !== null) note(tables, m[1].toLowerCase(), rel);

    // ── RPCs, with their argument names ──
    const rpcRe = /\.rpc\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*(?:,\s*\{([\s\S]{0,1200}?)\}\s*)?\)/gi;
    while ((m = rpcRe.exec(src)) !== null) {
      const name = m[1].toLowerCase();
      if (!rpcs.has(name)) rpcs.set(name, new Map());
      const argMap = rpcs.get(name)!;
      const body = m[2] ?? '';
      const argRe = /(?:^|[{,\s])(p_[a-z0-9_]+)\s*:/gi;
      let a: RegExpExecArray | null;
      while ((a = argRe.exec(body)) !== null) {
        const arg = a[1].toLowerCase();
        if (!argMap.has(arg)) argMap.set(arg, []);
        const list = argMap.get(arg)!;
        if (!list.includes(rel)) list.push(rel);
      }
    }
  }

  return { tables, rpcs };
}

// ---------------------------------------------------------------------------
// Migration scanning
// ---------------------------------------------------------------------------

/**
 * Extract `create [or replace] function <name>(<params>)` from SQL.
 *
 * The parameter list is captured so the verifier can compare the arguments
 * the code sends against the arguments the migration declares.
 */
function scanMigrations(): Map<string, { params: string[]; file: string }> {
  const fns = new Map<string, { params: string[]; file: string }>();
  if (!existsSync(MIGRATIONS)) return fns;

  for (const file of walk(MIGRATIONS).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      const name = m[1].toLowerCase();
      // Walk to the matching close paren of the parameter list.
      let depth = 1;
      let i = m.index + m[0].length;
      const start = i;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '(') depth++;
        else if (sql[i] === ')') depth--;
        i++;
      }
      const paramText = sql.slice(start, i - 1);
      const params = [...paramText.matchAll(/\b(p_[a-z0-9_]+)\b/gi)].map((p) => p[1].toLowerCase());
      const existing = fns.get(name);
      if (existing) {
        // Merge params so a later redefinition that adds an argument is visible.
        existing.params = [...new Set([...existing.params, ...params])];
      } else {
        fns.set(name, { params: [...new Set(params)], file: rel });
      }
    }
  }
  return fns;
}

// ---------------------------------------------------------------------------
// Snapshot (production OpenAPI capture)
// ---------------------------------------------------------------------------
interface Snapshot {
  readAt?: string;
  tables?: Record<string, string[]>;
  rpcs?: Record<string, { present?: boolean; parameters?: string[] | null; required?: string[] | null }>;
}

function loadSnapshot(): Snapshot | null {
  if (!existsSync(SNAPSHOT)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as Snapshot;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------
function main(): void {
  const { tables, rpcs } = scanCode();
  const migrations = scanMigrations();
  const snapshot = loadSnapshot();

  if (!snapshot) {
    add(
      'ERROR',
      'snapshot-missing',
      'audit/rpc-args.json',
      'The production schema snapshot is absent, so code-to-schema parity cannot be established. ' +
        'Restore the capture (see audit/rpc-args.mjs) or re-capture it.',
      'audit/rpc-args.json not found',
    );
  } else {
    // ── A. Tables the code names that the snapshot does not have ──
    const snapTables = new Set(Object.keys(snapshot.tables ?? {}));
    for (const [table, files] of tables) {
      if (snapTables.has(table)) continue;
      add(
        'ERROR',
        'table-absent-in-production',
        table,
        `The code reads or writes table "${table}", but the production schema snapshot does not contain it. ` +
          'Every query against it will fail at runtime with a PostgREST 404.',
        `used in ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` (+${files.length - 3} more)` : ''}`,
      );
    }

    // ── B. RPCs the code calls that the snapshot says are absent ──
    const snapRpcs = snapshot.rpcs ?? {};
    for (const [name, argMap] of rpcs) {
      const spec = snapRpcs[name];
      if (!spec) continue; // handled by the migration check below
      if (spec.present === false) {
        add(
          'ERROR',
          'rpc-absent-in-production',
          name,
          `The code calls RPC "${name}", but the production schema snapshot records it as absent.`,
          `called from ${[...argMap.values()].flat().slice(0, 2).join(', ')}`,
        );
        continue;
      }

      // ── C. Argument names the code sends that the function does not declare ──
      const declared = new Set((spec.parameters ?? []).map((p) => p.toLowerCase()));
      for (const [arg, files] of argMap) {
        if (declared.has(arg.toLowerCase())) continue;
        if (declared.size === 0) continue; // takesNoArguments — nothing to match against
        add(
          'ERROR',
          'rpc-argument-undeclared',
          `${name}.${arg}`,
          `The code sends argument "${arg}" to RPC "${name}", but the production function does not declare it. ` +
            'PostgREST rejects the call because the argument list does not match the function signature.',
          `sent from ${files.slice(0, 2).join(', ')}`,
        );
      }
    }
  }

  // ── D. RPCs the code calls that NO migration creates and the snapshot lacks ──
  //    (the reproducibility gap: a fresh database would be missing them)
  for (const [name, argMap] of rpcs) {
    if (migrations.has(name)) continue;
    if (snapshot?.rpcs?.[name]?.present) continue; // exists in production; only the migration is missing
    add(
      'ERROR',
      'rpc-unprovisioned',
      name,
      `The code calls RPC "${name}", but no migration under supabase/migrations/ creates it and the ` +
        'production snapshot does not record it. A freshly provisioned database would be missing this function.',
      `called from ${[...argMap.values()].flat().slice(0, 2).join(', ')}`,
    );
  }

  // ── E. RPCs the code calls that exist in production but have no migration ──
  //    (reproducibility warning — not an outage, the function IS deployed)
  for (const [name, argMap] of rpcs) {
    if (migrations.has(name)) continue;
    if (snapshot?.rpcs?.[name]?.present) {
      const callers = [...argMap.values()].flat();
      add(
        'WARNING',
        'rpc-missing-migration',
        name,
        `RPC "${name}" is called by the code and exists in production, but no migration in ` +
          'supabase/migrations/ creates it. It cannot be rebuilt from this repository alone.',
        callers.length ? `called from ${callers.slice(0, 2).join(', ')}` : 'called with no arguments',
      );
    }
  }

  // ── F. Arguments the code sends that the migration does not declare ──
  for (const [name, argMap] of rpcs) {
    const mig = migrations.get(name);
    if (!mig) continue;
    const declared = new Set(mig.params);
    if (declared.size === 0) continue;
    for (const [arg, files] of argMap) {
      if (declared.has(arg.toLowerCase())) continue;
      add(
        'WARNING',
        'rpc-argument-not-in-migration',
        `${name}.${arg}`,
        `The code sends argument "${arg}" to RPC "${name}", but the migration that creates it ` +
          `(${mig.file}) does not declare that parameter. The deployed function may have it and the ` +
          'migration may be out of date — confirm before re-provisioning.',
        `sent from ${files.slice(0, 2).join(', ')}`,
      );
    }
  }

  // ── G. Snapshot freshness ──
  if (snapshot?.readAt) {
    const ageDays = Math.floor((Date.now() - new Date(snapshot.readAt).getTime()) / 86_400_000);
    if (ageDays > 30) {
      add(
        'WARNING',
        'snapshot-stale',
        'audit/rpc-args.json',
        `The production schema snapshot is ${ageDays} days old (captured ${snapshot.readAt}). ` +
          'Findings about tables that are absent may be stale rather than real.',
        `readAt=${snapshot.readAt}`,
      );
    }
  }

  // ── Report ──
  const bySeverity: Record<string, number> = { ERROR: 0, WARNING: 0 };
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      code: `${sourceFiles().length} source files under src/`,
      migrations: existsSync(MIGRATIONS)
        ? `${walk(MIGRATIONS).filter((f) => f.endsWith('.sql')).length} SQL files under supabase/migrations/`
        : 'none',
      snapshot: snapshot ? `audit/rpc-args.json (readAt ${snapshot.readAt ?? 'unknown'})` : 'absent',
    },
    counts: {
      tablesReferencedByCode: tables.size,
      rpcsCalledByCode: rpcs.size,
      functionsCreatedByMigrations: migrations.size,
      tablesInSnapshot: Object.keys(snapshot?.tables ?? {}).length,
      rpcsInSnapshot: Object.keys(snapshot?.rpcs ?? {}).length,
    },
    summary: {
      totalFindings: findings.length,
      bySeverity,
    },
    findings: findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'ERROR' ? -1 : 1)),
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

  // ── Console output ──
  console.log('QBase schema parity — code vs production snapshot vs migrations');
  console.log('─'.repeat(72));
  console.log(`  tables referenced by code : ${report.counts.tablesReferencedByCode}`);
  console.log(`  RPCs called by code       : ${report.counts.rpcsCalledByCode}`);
  console.log(`  functions in migrations   : ${report.counts.functionsCreatedByMigrations}`);
  console.log(`  tables in snapshot        : ${report.counts.tablesInSnapshot}`);
  console.log(`  RPCs in snapshot          : ${report.counts.rpcsInSnapshot}`);
  console.log('');
  for (const f of report.findings) {
    console.log(`  [${f.severity}] ${f.code}: ${f.subject}`);
    console.log(`      ${f.detail}`);
    console.log(`      evidence: ${f.evidence}`);
  }
  console.log('');
  console.log(`  ${bySeverity.ERROR ?? 0} error(s), ${bySeverity.WARNING ?? 0} warning(s)`);
  console.log(`  report: ${relative(ROOT, REPORT)}`);

  if ((bySeverity.ERROR ?? 0) > 0) {
    console.error('\nSchema parity FAILED: the code and the database disagree.');
    process.exit(1);
  }
  console.log('\nSchema parity OK.');
}

main();
