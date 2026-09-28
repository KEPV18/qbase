#!/usr/bin/env node
// ============================================================================
// audit/rpc-signature-probe.mjs — Phase 2: RPC signature drift, read-only.
//
// WHY THIS EXISTS
//   PostgREST's OpenAPI document lists RPCs but reports their arguments as
//   `args: null`, so the deployed code's call sites cannot be checked against
//   the live signatures from the schema document alone. The generated types.ts
//   is not evidence either — it can be stale.
//
// WHY IT IS SAFE (does not mutate production)
//   Each probe sends ONE parameter name that cannot exist in any signature.
//   PostgREST resolves a named-argument call by matching the supplied key set
//   against the function's parameter names in its schema cache. An unmatched
//   key set means the function is never found, so the request fails with
//   PGRST202 *before* the function body runs. PostgREST's error `hint` then
//   names the real signature ("Perhaps you meant to call the function
//   public.x(p_a, p_b)"), which is the evidence this script collects.
//
//   No INSERT, UPDATE, DELETE, DDL or function execution occurs. The probe key
//   is deliberately one that no migration defines.
//
// Usage: node audit/rpc-signature-probe.mjs
// Writes: audit/rpc-signatures.json
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PROBE_KEY = 'p_qbase_probe_zzz_not_a_real_param';

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
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Nothing probed.');
  process.exit(1);
}
console.log('credentials loaded from the operator env file (values not printed)');

// RPCs the deployed code actually calls, plus a few whose intended contract
// matters to the approval/records analysis.
const TARGETS = [
  'create_record_validated',
  'append_audit_log',
  'create_notifications_batch',
  'admin_list_users',
  'soft_delete_record',
  'update_record_with_lock',
  'get_next_serial',
  'has_role',
  // expected to be absent — probing confirms absence rather than assuming it
  'lock_record_for_edit',
  'unlock_record',
  'save_record_version',
  'get_record_history',
  'get_record_version_history',
  'restore_record_version',
];

const out = {};
for (const rpc of TARGETS) {
  let status = null;
  let body = null;
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ [PROBE_KEY]: 'x' }),
    });
    status = res.status;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 300) };
    }
  } catch (e) {
    out[rpc] = { status: null, error: String(e && e.message) };
    console.log(`${rpc.padEnd(28)} NETWORK ERROR ${e && e.message}`);
    continue;
  }
  const code = body && body.code;
  const message = body && body.message;
  const hint = body && body.hint;
  out[rpc] = { status, code, message, hint };

  // Read the signal correctly. The `hint` is a NAME-SIMILARITY suggestion
  // ("Perhaps you meant to call the function public.get_record_count"), NOT the
  // argument list. So:
  //   hint present     -> the requested NAME does not exist; PostgREST is
  //                       offering a different function => the RPC is ABSENT.
  //   hint absent      -> the name resolved and only the argument set failed
  //                       => the RPC EXISTS.
  // The authoritative argument list is the OpenAPI requestBody schema; this
  // probe only settles existence/absence, which it does without executing
  // anything.
  const exists = !hint && status === 404 && code === 'PGRST202';
  const verdict =
    status !== 404 || code !== 'PGRST202'
      ? `UNEXPECTED status ${status} code ${code}`
      : exists
        ? 'EXISTS (name resolved; only the argument set failed)'
        : 'ABSENT (name did not match any function; hint suggests a different one)';
  console.log(`${rpc.padEnd(28)} ${String(status).padEnd(4)} ${String(code || '').padEnd(10)} ${verdict}`);
  if (message) console.log(`  message: ${message}`);
  if (hint) console.log(`  hint   : ${hint}`);
}

const OUT = join(process.cwd(), 'audit', 'rpc-signatures.json');
writeFileSync(OUT, JSON.stringify({ probeKeySent: PROBE_KEY, results: out }, null, 2));
console.log(`\nwritten: ${OUT}`);
