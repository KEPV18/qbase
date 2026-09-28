#!/usr/bin/env node
// ============================================================================
// audit/schema-parity.mjs — Phase 2: code <-> production schema parity.
//
// The authority is the production PostgREST OpenAPI document
// (/tmp/ghq/prod_openapi.json): its `definitions.<table>.properties` keys are a
// complete, server-generated column list per table, and `paths./rpc/<name>`
// lists every RPC. This scan does NOT treat TypeScript types as evidence of the
// database, and does NOT treat a successful select('*') as parity.
//
// Two independent comparisons are produced:
//
//   A. CODE vs PRODUCTION   — every table/column/RPC the deployed source names.
//   B. TYPES vs PRODUCTION  — the generated types.ts Row blocks, i.e. drift
//      between what the IDE believes and what the server actually has.
//
// Every finding carries REACHABILITY computed from the real entry points, so
// dead code is not reported as a production outage and live code is not
// dismissed as dead:
//
//   reachable + write path -> P1 | reachable + read path -> P2 | unreachable -> P4
//
// Payload keys are collected two ways, because this codebase uses both:
//   * object literals  -> .update({ a: 1, b: 2 })
//   * bracket / literal assignment -> payload['a'] = 1, Object.assign(payload, {b: 2})
// The second form matters: recordStorage.ts writes approval_status and
// department exactly that way, so object-literal scanning alone would miss the
// single most consequential defect in the tree.
//
// Usage: node audit/schema-parity.mjs [--root .] [--openapi <file>]
// Writes: audit/schema-parity-report.json
// ============================================================================

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const args = process.argv.slice(2);
const argOf = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = resolve(argOf('--root', '.'));
const OPENAPI = argOf('--openapi', '/tmp/ghq/prod_openapi.json');

// ---------------------------------------------------------------------------
// Production schema — the authority
// ---------------------------------------------------------------------------
const oa = JSON.parse(readFileSync(OPENAPI, 'utf8'));
const prodTables = new Map();
for (const [name, def] of Object.entries(oa.definitions || {})) {
  prodTables.set(name, new Set(Object.keys(def.properties || {})));
}
const prodRpcs = new Set();
const prodRpcSpecs = new Map(); // name -> { properties:Set, required:Set }
for (const [p, v] of Object.entries(oa.paths || {})) {
  const m = /^\/rpc\/(.+)$/.exec(p);
  if (!m) continue;
  prodRpcs.add(m[1]);
  const body = ((v.post || {}).parameters || []).find((x) => x.in === 'body');
  const schema = (body && body.schema) || {};
  prodRpcSpecs.set(m[1], {
    properties: new Set(Object.keys(schema.properties || {})),
    required: new Set(schema.required || []),
  });
}
if (prodTables.size === 0) {
  console.error('No definitions in the OpenAPI document — refusing to report parity from an empty schema.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Walk the deployed source (audit/ excluded so the scanner cannot read itself)
// ---------------------------------------------------------------------------
const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'audit']);
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name));
    } else if (SRC_EXT.has(e.name.slice(e.name.lastIndexOf('.')))) {
      files.push(join(dir, e.name));
    }
  }
})(ROOT);

const read = (f) => readFileSync(f, 'utf8');
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
const rel = (f) => relative(ROOT, f) || f;

// ---------------------------------------------------------------------------
// Entry points — taken from the build config, not guessed.
//   index.html  -> <script type="module" src="/src/main.tsx">
//   api/*.js    -> Vercel serverless functions (separate runtimes)
//   server/*.js -> local server
// ---------------------------------------------------------------------------
const roots = [];
const mainTsx = join(ROOT, 'src', 'main.tsx');
if (existsSync(mainTsx)) roots.push(mainTsx);
else console.error('WARNING: src/main.tsx not found — client reachability cannot be established.');
for (const dir of ['api', 'server']) {
  const d = join(ROOT, dir);
  if (!existsSync(d)) continue;
  // recursive: api/auth/callback.js and api/auth/index.js are entry points too
  (function collect(current) {
    for (const e of readdirSync(current, { withFileTypes: true })) {
      if (e.isDirectory()) collect(join(current, e.name));
      else if (SRC_EXT.has(e.name.slice(e.name.lastIndexOf('.')))) roots.push(join(current, e.name));
    }
  })(d);
}
if (roots.length === 0) {
  console.error('No entry points found — refusing to guess reachability.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Import graph -> reachability
// ---------------------------------------------------------------------------
const IMPORTS = new Map();
for (const f of files) {
  const src = read(f);
  const out = [];
  const re = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    let base;
    if (spec.startsWith('@/')) base = join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = resolve(dirname(f), spec);
    else continue;
    for (const cand of [base, base + '.ts', base + '.tsx', base + '.js', base + '.jsx', join(base, 'index.ts'), join(base, 'index.tsx')]) {
      try {
        if (statSync(cand).isFile()) {
          out.push(cand);
          break;
        }
      } catch {
        /* keep trying */
      }
    }
  }
  IMPORTS.set(f, out);
}

const reachable = new Set();
const queue = [...roots];
while (queue.length) {
  const f = queue.pop();
  if (reachable.has(f)) continue;
  reachable.add(f);
  for (const n of IMPORTS.get(f) || []) if (!reachable.has(n)) queue.push(n);
}

// ---------------------------------------------------------------------------
// types.ts: declared Row columns per table (comparison B)
// ---------------------------------------------------------------------------
const TYPES_FILE = join(ROOT, 'src', 'integrations', 'supabase', 'types.ts');
const declaredTypes = new Map();
if (existsSync(TYPES_FILE)) {
  const src = read(TYPES_FILE);
  const lines = src.split('\n');
  // Scope strictly to the `public` schema. types.ts also describes graphql_public,
  // which contains a table literally named `graphql`; matching at 6-space indent
  // without this bound reports that table as a phantom in the public schema.
  const pubStart = lines.findIndex((l) => /^ {2}public: \{$/.test(l));
  const afterPub = pubStart < 0 ? lines : lines.slice(pubStart + 1);
  const pubEndRel = afterPub.findIndex((l) => /^ {2}[a-z_][a-z0-9_]*: \{$/.test(l));
  const lines_ = pubStart < 0 ? lines : afterPub.slice(0, pubEndRel < 0 ? afterPub.length : pubEndRel);
  if (pubStart < 0) console.error('WARNING: could not locate the public schema in types.ts.');
  const blockRe = /^ {6}([a-z_][a-z0-9_]*): \{$/;
  for (let i = 0; i < lines_.length; i++) {
    const m = blockRe.exec(lines_[i]);
    if (!m) continue;
    const table = m[1];
    // find `Row: {` and read keys until the brace closes at Row's own indent
    let j = i + 1;
    let rowStart = -1;
    for (; j < lines_.length && j < i + 400; j++) {
      if (/^ {8}Row: \{$/.test(lines_[j])) {
        rowStart = j;
        break;
      }
    }
    if (rowStart < 0) continue;
    const cols = [];
    for (let k = rowStart + 1; k < lines_.length; k++) {
      if (/^ {8}\}$/.test(lines_[k])) break;
      const c = /^ {10}([A-Za-z_][A-Za-z0-9_]*)\??:/.exec(lines_[k]);
      if (c) cols.push(c[1]);
    }
    declaredTypes.set(table, new Set(cols));
  }
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------
const SELECT_METHODS = ['select', 'order', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'not', 'contains', 'containedBy', 'textSearch', 'filter', 'or', 'and'];
const OBJECT_METHODS = ['update', 'insert', 'upsert', 'match'];
const WRITE_METHODS = new Set(['update', 'insert', 'upsert', 'match']);

function chainAfter(src, startIdx) {
  let depth = 0;
  let i = startIdx;
  const end = Math.min(src.length, startIdx + 4000);
  for (; i < end; i++) {
    const c = src[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth--;
    } else if (c === ';' && depth === 0) break;
    else if (c === '\n' && depth === 0) {
      const rest = src.slice(i + 1).match(/^[ \t]*([\s\S]?)/);
      if (!rest || rest[1] !== '.') break;
    }
  }
  return { text: src.slice(startIdx, i), offset: startIdx };
}

function objectKeys(text) {
  // Callers pass the content INSIDE a brace pair (braces already stripped), so
  // top-level separators sit at depth 0. Testing for depth 1 here silently kept
  // only the first key of every payload, which both manufactured false
  // "missing required argument" findings and hid genuinely unknown arguments.
  const keys = [];
  let depth = 0;
  let token = '';
  const push = () => {
    const t = token.trim().replace(/,$/, '');
    const m = /^(?:['"]([A-Za-z_][A-Za-z0-9_]*)['"]|([A-Za-z_][A-Za-z0-9_]*))\s*:/.exec(t);
    if (m) keys.push(m[1] || m[2]);
    else if (t.trim().startsWith('[')) keys.push('[computed]');
    token = '';
  };
  for (const c of text) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) push();
    else token += c;
  }
  push();
  return keys;
}

function selectColumns(s) {
  const out = [];
  let depth = 0;
  let token = '';
  const push = () => {
    const t = token.trim();
    token = '';
    if (!t || t === '*') return;
    if (/[()]/.test(t)) return;
    let col = t.includes(':') ? t.slice(t.indexOf(':') + 1) : t;
    if (col.includes('::')) col = col.slice(0, col.indexOf('::'));
    col = col.trim().replace(/^['"]|['"]$/g, '');
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) out.push(col);
  };
  for (const c of s) {
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) push();
    else token += c;
  }
  push();
  return out;
}

/** Enclosing top-level function start index, so payload keys attach to the right chain. */
function enclosingFnStart(src, idx) {
  const before = src.slice(0, idx);
  const re = /(?:^|\n)(?:export\s+)?(?:async\s+)?(?:function\s+[A-Za-z0-9_$]+|const\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?\()/g;
  let last = 0;
  let m;
  while ((m = re.exec(before))) last = m.index + m[0].length;
  return last;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------
const findings = [];
const referenced = new Map();
const referencedTables = new Map();
const referencedRpcs = new Map();

const FROM_RE = /\.from\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)/g;
const RPC_RE = /\.rpc\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
const RPC_CALL_RE = /\.rpc\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*,?/g;
const BRACKET_ASSIGN_RE = /\[(?:['"]([A-Za-z_][A-Za-z0-9_]*)['"]|`([A-Za-z_][A-Za-z0-9_]*)`)\]\s*=[^=]/g;
const ASSIGN_OBJ_RE = /Object\.assign\(\s*([A-Za-z0-9_$.]+)\s*,\s*\{/g;

for (const f of files) {
  const src = read(f);
  const r = rel(f);
  const isTest = /\.(test|spec)\.[tj]sx?$/.test(f) || f.includes('__tests__');

  // Write payload keys assigned by bracket notation / Object.assign, grouped by
  // the enclosing function so they attach to that function's write chain.
  const assignedKeys = new Map(); // fnStart -> [{key, line}]
  const fnStartOf = (idx) => enclosingFnStart(src, idx);
  let a;
  BRACKET_ASSIGN_RE.lastIndex = 0;
  while ((a = BRACKET_ASSIGN_RE.exec(src))) {
    const key = a[1] || a[2];
    const fn = fnStartOf(a.index);
    if (!assignedKeys.has(fn)) assignedKeys.set(fn, []);
    assignedKeys.get(fn).push({ key, line: lineOf(src, a.index), via: 'bracket-assign' });
  }
  ASSIGN_OBJ_RE.lastIndex = 0;
  while ((a = ASSIGN_OBJ_RE.exec(src))) {
    const braceStart = a.index + a[0].length - 1;
    let depth = 0;
    let j = braceStart;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const fn = fnStartOf(a.index);
    if (!assignedKeys.has(fn)) assignedKeys.set(fn, []);
    for (const key of objectKeys(src.slice(braceStart + 1, j))) {
      if (key !== '[computed]') assignedKeys.get(fn).push({ key, line: lineOf(src, a.index), via: 'Object.assign' });
    }
  }

  let m;
  FROM_RE.lastIndex = 0;
  while ((m = FROM_RE.exec(src))) {
    const table = m[1];
    if (!referencedTables.has(table)) referencedTables.set(table, []);
    referencedTables.get(table).push({ file: r, line: lineOf(src, m.index) });

    const { text, offset } = chainAfter(src, FROM_RE.lastIndex);
    const record = (col, method, lineNo, via) => {
      if (!referenced.has(table)) referenced.set(table, new Set());
      referenced.get(table).add(col);
      if (prodTables.has(table) && !prodTables.get(table).has(col)) {
        findings.push({ table, column: col, kind: 'column_missing', method, via: via || 'chain', file: r, line: lineNo, isTest });
      }
    };

    for (const meth of SELECT_METHODS) {
      const re = new RegExp(`\\.${meth}\\(\\s*['"\`]([^'"\`]*)['"\`]`, 'g');
      let mm;
      while ((mm = re.exec(text))) {
        const raw = mm[1];
        const lineNo = lineOf(src, offset + mm.index);
        if (meth === 'select') for (const col of selectColumns(raw)) record(col, 'select', lineNo);
        else if (meth === 'or' || meth === 'and') {
          for (const part of raw.split(',')) {
            const col = part.trim().split('.')[0];
            if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) record(col, meth, lineNo);
          }
        } else {
          const col = raw.trim();
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) record(col, meth, lineNo);
        }
      }
    }

    for (const meth of OBJECT_METHODS) {
      const re = new RegExp(`\\.${meth}\\(\\s*\\{`, 'g');
      let mm;
      while ((mm = re.exec(text))) {
        const braceStart = mm.index + mm[0].length - 1;
        let depth = 0;
        let j = braceStart;
        for (; j < text.length; j++) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') {
            depth--;
            if (depth === 0) break;
          }
        }
        const lineNo = lineOf(src, offset + mm.index);
        for (const key of objectKeys(text.slice(braceStart + 1, j))) {
          if (key !== '[computed]') record(key, meth, lineNo, 'object-literal');
        }
      }
      // identifier payload: .update(payload) — pick up what was assigned to it
      const reId = new RegExp(`\\.${meth}\\(\\s*([A-Za-z0-9_$]+)\\s*[,)]`, 'g');
      let mi;
      while ((mi = reId.exec(text))) {
        if (['true', 'false', 'null', 'undefined'].includes(mi[1])) continue;
        const fn = enclosingFnStart(src, offset + mi.index);
        for (const { key, line, via } of assignedKeys.get(fn) || []) {
          record(key, meth, line, via);
        }
      }
    }
  }

  RPC_RE.lastIndex = 0;
  while ((m = RPC_RE.exec(src))) {
    const name = m[1];
    const line = lineOf(src, m.index);
    if (!referencedRpcs.has(name)) referencedRpcs.set(name, []);
    referencedRpcs.get(name).push({ file: r, line });
    if (!prodRpcs.has(name)) findings.push({ table: null, column: null, kind: 'rpc_missing', rpc: name, file: r, line, isTest });
  }

  // RPC ARGUMENT drift. PostgREST resolves a named-argument call by matching the
  // supplied key set against the function's parameters in its schema cache: a key
  // that is not a parameter means NO function matches, and the request fails with
  // PGRST202 *before* the body runs. So an invented argument name does not degrade
  // a write — it prevents it entirely. The OpenAPI's requestBody schema is the
  // server's own parameter list and is therefore the authority here.
  RPC_CALL_RE.lastIndex = 0;
  while ((m = RPC_CALL_RE.exec(src))) {
    const name = m[1];
    const spec = prodRpcSpecs.get(name);
    const line = lineOf(src, m.index);
    let rest = src.slice(RPC_CALL_RE.lastIndex);
    const consumed = rest.length - rest.replace(/^\s*/, '').length;
    rest = rest.slice(consumed);
    let supplied = null;
    let via = 'object-literal';
    if (rest.startsWith('{')) {
      let depth = 0;
      let j = 0;
      for (; j < rest.length; j++) {
        if (rest[j] === '{') depth++;
        else if (rest[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      supplied = new Set(objectKeys(rest.slice(1, j)).filter((k) => k !== '[computed]'));
    } else if (rest.startsWith(')')) {
      supplied = new Set();
      via = 'no-arguments';
    } else {
      via = 'dynamic-payload';
    }

    if (via === 'dynamic-payload') {
      // cannot be judged statically; record it so it is not silently ignored
      findings.push({ table: null, column: null, kind: 'rpc_dynamic_args', rpc: name, file: r, line, isTest, via });
    } else if (spec && supplied) {
      const unknown = [...supplied].filter((k) => !spec.properties.has(k));
      const missing = [...spec.required].filter((k) => !supplied.has(k));
      if (unknown.length) {
        findings.push({ table: null, column: unknown.join('+'), kind: 'rpc_arg_unknown', rpc: name, file: r, line, isTest, via, detail: unknown });
      }
      if (missing.length) {
        findings.push({ table: null, column: missing.join('+'), kind: 'rpc_arg_missing_required', rpc: name, file: r, line, isTest, via, detail: missing });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Classify
// ---------------------------------------------------------------------------
for (const f of findings) {
  f.reachable = reachable.has(join(ROOT, f.file));
  if (f.isTest || !f.reachable) f.severity = 'P4';
  else if (f.kind === 'rpc_dynamic_args') f.severity = 'P3'; // cannot be judged statically
  else if (f.kind === 'rpc_missing' || f.kind === 'rpc_arg_unknown' || f.kind === 'rpc_arg_missing_required') f.severity = 'P1';
  else if (!prodTables.has(f.table)) f.severity = 'P1';
  else f.severity = WRITE_METHODS.has(f.method) ? 'P1' : 'P2';
}
const seen = new Set();
const deduped = findings.filter((f) => {
  const k = `${f.kind}|${f.table}|${f.column}|${f.rpc}|${f.file}|${f.line}|${f.method}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// ---------------------------------------------------------------------------
// Comparison B: types.ts Row vs production
// ---------------------------------------------------------------------------
const typesDrift = [];
for (const [table, cols] of declaredTypes) {
  if (!prodTables.has(table)) {
    typesDrift.push({ table, kind: 'table_declared_but_absent_from_production', columns: [...cols], severity: 'P3' });
    continue;
  }
  const prod = prodTables.get(table);
  const phantom = [...cols].filter((c) => !prod.has(c));
  const undeclared = [...prod].filter((c) => !cols.has(c));
  if (phantom.length) typesDrift.push({ table, kind: 'declared_but_absent_from_production', columns: phantom, severity: 'P3' });
  if (undeclared.length) typesDrift.push({ table, kind: 'present_in_production_but_undeclared', columns: undeclared, severity: 'P3' });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const bySeverity = {};
for (const f of deduped) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;

const missingTables = [...referencedTables.keys()].filter((t) => !prodTables.has(t));
const unreferenced = {};
for (const [t, cols] of prodTables) {
  const used = referenced.get(t);
  if (!used) unreferenced[t] = [...cols];
  else {
    const unused = [...cols].filter((c) => !used.has(c));
    if (unused.length) unreferenced[t] = unused;
  }
}

const report = {
  generatedFrom: {
    root: ROOT,
    openapi: OPENAPI,
    productionTables: prodTables.size,
    productionRpcs: prodRpcs.size,
    sourceFilesScanned: files.length,
    entryPoints: roots.map(rel),
    reachableFiles: reachable.size,
  },
  summary: { bySeverity, totalFindings: deduped.length, tablesReferencedButAbsent: missingTables },
  findings: deduped.sort((a, b) => a.severity.localeCompare(b.severity) || (a.table || '').localeCompare(b.table || '')),
  typesDrift,
  unreferencedProductionColumns: unreferenced,
  rpcsCalledButAbsent: [...referencedRpcs.entries()].filter(([n]) => !prodRpcs.has(n)).map(([n, sites]) => ({ rpc: n, sites })),
  prodRpcsNeverCalled: [...prodRpcs].filter((n) => !referencedRpcs.has(n)).sort(),
};

const OUT = join(ROOT, 'audit', 'schema-parity-report.json');
writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log('='.repeat(78));
console.log('PHASE 2 — CODE <-> PRODUCTION SCHEMA PARITY');
console.log('='.repeat(78));
console.log(`  production tables : ${prodTables.size}`);
console.log(`  production RPCs   : ${prodRpcs.size}`);
console.log(`  source files      : ${files.length}   reachable from entry points: ${reachable.size}`);
console.log(`  entry points      : ${roots.map(rel).join(', ')}`);
console.log('');
console.log(`  findings by severity: ${JSON.stringify(bySeverity)}`);
console.log('');

if (missingTables.length) {
  console.log('  TABLES REFERENCED BUT ABSENT FROM PRODUCTION (would 404):');
  for (const t of missingTables) for (const s of referencedTables.get(t)) console.log(`    ${t}  ${s.file}:${s.line}`);
  console.log('');
}

const live = deduped.filter((f) => f.severity === 'P1' || f.severity === 'P2');
const dead = deduped.filter((f) => f.severity === 'P4');
const show = (arr, title) => {
  if (!arr.length) return;
  console.log(`  ${title} (${arr.length}):`);
  for (const f of arr) {
    const what = f.rpc ? `rpc ${f.rpc}` : `${f.table}.${f.column}`;
    const how = [f.method, f.via].filter(Boolean).join('/') || f.kind;
    console.log(`    [${f.severity}] ${what}  ${how}  ${f.file}:${f.line}`);
    if (f.detail) console.log(`             offending: ${f.detail.join(', ')}`);
  }
  console.log('');
};
show(live, 'LIVE MISMATCHES (reachable code)');
show(dead, 'DEAD-CODE MISMATCHES (unreachable / test-only)');

const rpcArg = deduped.filter((f) => /^rpc_arg/.test(f.kind));
if (rpcArg.length) {
  console.log('  RPC ARGUMENT DRIFT (a mismatched key set means PostgREST finds NO function => PGRST202):');
  for (const f of rpcArg) {
    console.log(`    [${f.severity}] ${f.rpc}  ${f.kind}  ${f.file}:${f.line}`);
    console.log(`             ${f.detail.length} arg(s): ${f.detail.join(', ')}`);
  }
  console.log('');
}

if (typesDrift.length) {
  console.log('  TYPES.TS vs PRODUCTION DRIFT:');
  for (const d of typesDrift) console.log(`    [${d.severity}] ${d.table}: ${d.kind}\n             ${d.columns.join(', ')}`);
  console.log('');
}
if (report.rpcsCalledButAbsent.length) {
  console.log('  RPCs CALLED BUT ABSENT FROM PRODUCTION (PGRST202):');
  for (const { rpc, sites } of report.rpcsCalledButAbsent) console.log(`    ${rpc}  <- ${sites.map((s) => `${s.file}:${s.line}`).join(', ')}`);
  console.log('');
}
console.log(`  report: ${rel(OUT)}`);
console.log('');
process.exit(live.some((f) => f.severity === 'P1') ? 1 : 0);
