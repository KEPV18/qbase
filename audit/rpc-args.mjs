#!/usr/bin/env node
// ============================================================================
// audit/rpc-args.mjs — Phase 2/5: authoritative RPC argument lists, READ-ONLY.
//
// WHY THIS EXISTS
//   rpc-signature-probe.mjs settles whether an RPC EXISTS (a probe key that
//   matches no parameter makes PostgREST fail with PGRST202 before execution).
//   It cannot report the real parameter names — PostgREST's OpenAPI document is
//   the only place that lists them, and the checked-in generated types.ts is not
//   evidence (it is stale: its `records.Row` is missing `project_id`, which
//   production has).
//
//   This matters because recordStorage.createRecord() calls
//   create_record_validated with p_approval_status and p_department. If those are
//   not real parameters the whole call fails to resolve, so the question has to
//   be answered from the live signature rather than assumed.
//
// SAFETY
//   One GET of the PostgREST OpenAPI document. No RPC execution, no INSERT /
//   UPDATE / DELETE, no DDL, no storage access. Credentials are parsed in-process
//   from the operator env file and never printed.
//
// Usage: node audit/rpc-args.mjs
// Writes: audit/rpc-args.json
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
console.log('credentials loaded from the operator env file (values not printed)');

// The RPCs the deployed code calls, plus the approval/versioning names whose
// absence or presence Phase 3 and Phase 6 need to state factually.
const TARGETS = [
  'create_record_validated',
  'append_audit_log',
  'create_notifications_batch',
  'admin_list_users',
  'soft_delete_record',
  'update_record_with_lock',
  'get_next_serial',
  'has_role',
  'get_record_count',
];

const res = await fetch(`${URL_}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/openapi+json' },
});
if (!res.ok) {
  console.error(`GET /rest/v1/ -> ${res.status} ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const spec = await res.json();

const defs = spec.definitions || {};
const paths = spec.paths || {};

// Table/view columns come from definitions; a column is a $ref when it is an enum.
function columnNames(defKey) {
  const props = (defs[defKey] && defs[defKey].properties) || {};
  return Object.keys(props);
}

const tables = {};
for (const key of Object.keys(defs).sort()) {
  tables[key] = columnNames(key);
}

// RPC arguments. This deployment serves Swagger 2.0, so the argument list is a
// body parameter: paths./rpc/<name>.post.parameters[] with in === 'body', whose
// schema is {properties:{p_x:{...}}, required:[...], type:'object'}.
// (OpenAPI 3 would put it at requestBody.content['application/json'].schema;
// both shapes are read so the script does not silently report nulls again if the
// document version ever changes.)
function bodySchema(post) {
  if (!post) return null;
  if (Array.isArray(post.parameters)) {
    const body = post.parameters.find((p) => p && p.in === 'body');
    if (body && body.schema) return body.schema;
  }
  const rb = post.requestBody;
  const c = rb && rb.content && rb.content['application/json'];
  return (c && c.schema) || null;
}

const rpcs = {};
for (const name of TARGETS) {
  const p = paths[`/rpc/${name}`];
  if (!p) {
    rpcs[name] = { present: false };
    continue;
  }
  const schema = bodySchema(p.post);
  const params = schema && schema.properties ? Object.keys(schema.properties) : null;
  rpcs[name] = {
    present: true,
    parameters: params,
    required: (schema && schema.required) || null,
    // A function with no arguments is emitted with an empty/absent properties
    // object; record which so a null list is not mistaken for "not found".
    takesNoArguments: !!params && params.length === 0,
  };
}

const out = {
  readAt: new Date().toISOString(),
  readOnly: true,
  openapiVersion: spec.openapi || spec.swagger || null,
  tableCount: Object.keys(tables).length,
  tables,
  rpcs,
};
writeFileSync(join(process.cwd(), 'audit', 'rpc-args.json'), JSON.stringify(out, null, 2));

console.log(`\nOpenAPI ${out.openapiVersion}; ${out.tableCount} definitions\n`);
for (const name of TARGETS) {
  const r = rpcs[name];
  console.log(
    r.present
      ? `${name}\n    params: ${JSON.stringify(r.parameters)}\n    required: ${JSON.stringify(r.required)}`
      : `${name}\n    ABSENT from the OpenAPI paths`,
  );
}
console.log('\n=== records columns (authoritative) ===');
console.log(JSON.stringify(tables.records));
