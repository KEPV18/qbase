#!/usr/bin/env node
// ============================================================================
// prime-backup.mjs — full production backup over the Supabase REST API.
//
// Usage:  node scripts/prime-backup.mjs <backup-root-dir>
//
// Reads credentials from ~/.config/qbase/backup.env (fail closed when the
// service-role key or URL is missing) and never prints secret values.
// Output is independent of the repository:
//   <root>/database/<table>.jsonl   one JSON row per line (ISO-8601 timestamps
//                                   inside rows, as stored by Postgres)
//   <root>/schema/openapi.json      live PostgREST OpenAPI snapshot
//   <root>/metadata/headers.json    server + PostgREST version headers
//   <root>/manifest.json            { tool, taken_at, source_host,
//                                     repo_commit, tables: { name: {
//                                     rows, pk, columns, sha256 } } }
//   <root>/verification/report.json re-read verification (rows + sha256)
//
// Table discovery comes from the live OpenAPI document, so a new production
// table is never missed. Pagination is keyset-style on a single uuid `id`
// column when present (stable under concurrent inserts), otherwise one
// large-range ordered fetch with count verification.
// ============================================================================
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const VERSION = "prime-backup/1.0.0";
const PAGE = 5000;

function fail(msg) {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

// ── fail-closed env loader (secret values never printed) ───────────────────
function loadEnv() {
  const envPath = join(homedir(), ".config", "qbase", "backup.env");
  if (!existsSync(envPath)) fail(`env file missing: ${envPath}`);
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  const url = vars.SUPABASE_URL || vars.VITE_SUPABASE_URL || "";
  const key = vars.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
    fail("SUPABASE_URL missing or not a supabase.co project host");
  }
  if (key.split(".").length !== 3 || !key.startsWith("eyJ")) {
    fail("SUPABASE_SERVICE_ROLE_KEY missing or not a JWT — refusing to run");
  }
  return { url: url.replace(/\/$/, ""), key };
}

const { url: BASE, key: KEY } = loadEnv();

async function fetchJson(path, accept = "application/json") {
  const res = await fetch(`${BASE}${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: accept },
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    fail(`GET ${path} -> HTTP ${res.status}: ${body}`);
  }
  return res;
}

// ── arguments ───────────────────────────────────────────────────────────────
const root = process.argv[2];
if (!root || !root.startsWith("/") || !root.startsWith(process.env.HOME + "/")) {
  fail("usage: node scripts/prime-backup.mjs <absolute backup dir under your home>");
}
if (existsSync(root)) fail(`refusing to overwrite existing directory: ${root}`);

let gitSha = "unknown";
try { gitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(); } catch {}

console.log(`Prime backup -> ${root}`);
console.log(`source host  : ${BASE}`);
console.log(`repo commit  : ${gitSha}`);

mkdirSync(join(root, "database"), { recursive: true });
mkdirSync(join(root, "schema"), { recursive: true });
mkdirSync(join(root, "metadata"), { recursive: true });
mkdirSync(join(root, "verification"), { recursive: true });

// ── 1. OpenAPI snapshot ─────────────────────────────────────────────────────
const openapi = await (async () => {
  const res = await fetch(`${BASE}/rest/v1/`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/openapi+json" },
  });
  if (!res.ok) fail(`OpenAPI fetch -> HTTP ${res.status}`);
  return res.json();
})();
writeFileSync(join(root, "schema", "openapi.json"), JSON.stringify(openapi, null, 2));

// ── 2. server metadata (versions, no secrets) ───────────────────────────────
const meta = {};
for (const probe of [["rest", "/rest/v1/records?select=id&limit=0"]]) {
  const res = await fetch(`${BASE}${probe[1]}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  meta[probe[0]] = {
    status: res.status,
    server: res.headers.get("server") || "",
    postgrest_version: res.headers.get("x-postgrest-version") || res.headers.get("content-version") || "",
    date: res.headers.get("date") || "",
  };
}
writeFileSync(join(root, "metadata", "headers.json"), JSON.stringify(meta, null, 2));

// ── 3. table discovery ──────────────────────────────────────────────────────
const defs = openapi.definitions || openapi.components?.schemas || {};
const tables = Object.keys(defs).sort();
if (tables.length === 0) fail("no table definitions found in the OpenAPI document");

function pkColumn(def, table) {
  if (Array.isArray(def.primaryKeys) && def.primaryKeys.length === 1) {
    return def.primaryKeys[0];
  }
  if (def.properties && "id" in def.properties) return "id";
  fail(`cannot determine a stable ordering column for ${table}`);
}

// ── 4. dumps ────────────────────────────────────────────────────────────────
const manifest = {
  tool: VERSION,
  taken_at: new Date().toISOString(),
  source_host: BASE,
  repo_commit: gitSha,
  tables: {},
};

for (const table of tables) {
  const def = defs[table];
  const cols = Object.keys(def.properties ?? {});
  const pk = pkColumn(def, table);
  const isUuid = (def.properties[pk]?.format ?? "").includes("uuid");
  const outFile = join(root, "database", `${table}.jsonl`);
  const hash = createHash("sha256");
  let rows = 0;
  let cursor = null;
  let total = null; // table total from the unfiltered first page's content-range
  let cap = null; // the server's actual max page size (may be < PAGE)

  mkdirSync(join(root, "database"), { recursive: true });
  writeFileSync(outFile, "");

  for (;;) {
    const keyset = isUuid && cursor ? `&${pk}=gt.${cursor}` : "";
    if (isUuid && cursor === null) cursor = ""; // enables keyset from the start
    const fromStart = !isUuid;
    const path =
      `/rest/v1/${table}?select=${cols.join(",")}` +
      `&order=${pk}.asc.nullslast&limit=${PAGE}` +
      (fromStart ? "" : keyset);
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      fail(`table ${table} -> HTTP ${res.status}: ${body}`);
    }
    const page = await res.json();
    if (!Array.isArray(page)) fail(`table ${table}: non-array response`);

    const cr = res.headers.get("content-range") || "";
    const crTotal = cr.includes("/") && /^\d+$/.test(cr.split("/")[1])
      ? Number(cr.split("/")[1])
      : null;
    if (rows === 0 && total === null) total = crTotal; // first page: table total

    let chunk = "";
    for (const row of page) {
      chunk += JSON.stringify(row) + "\n";
      rows += 1;
    }
    if (chunk) {
      hash.update(chunk);
      appendFileSync(outFile, chunk);
    }

    if (total !== null && rows >= total) break; // reached the table total

    if (page.length === 0) {
      if (total !== null && rows < total) {
        fail(`table ${table}: empty page at rows=${rows} but total=${total}`);
      }
      break;
    }
    // The server may cap pages below PAGE (Supabase caps at 1000). A page
    // shorter than the detected cap means everything was fetched — but only
    // if the total agrees; otherwise keep paging.
    if (cap === null && page.length < PAGE) cap = page.length;
    if (cap === null) cap = page.length;
    if (page.length < cap) {
      if (total === null || rows < total) {
        fail(`table ${table}: short page at rows=${rows} but total=${total ?? "unknown"}`);
      }
      break;
    }
    if (!isUuid) {
      // Non-keyset tables rely on one exact-count fetch; refuse rather than
      // silently miss rows when the table exceeds a single page.
      if (total !== null && total > cap) {
        fail(`table ${table}: ${total} rows but non-keyset paging caps at ${cap} — extend the tool`);
      }
      break;
    }
    cursor = page[page.length - 1][pk];
  }

  if (total !== null && rows !== total) {
    fail(`table ${table}: fetched ${rows} rows but table total=${total}`);
  }
  const sha = hash.digest("hex");
  manifest.tables[table] = { rows, pk, columns: cols, sha256: sha };
  console.log(
    `  ${table.padEnd(22)} rows=${String(rows).padStart(6)} sha256=${sha.slice(0, 12)}…`,
  );
}

// ── 5. verification pass (re-read what we wrote) ────────────────────────────
const verification = { tool: VERSION, verified_at: new Date().toISOString(), tables: {}, ok: true };

for (const [table, info] of Object.entries(manifest.tables)) {
  const raw = readFileSync(join(root, "database", `${table}.jsonl`), "utf8");
  const lines = raw ? raw.split("\n").filter((l) => l.length > 0) : [];
  const hash = createHash("sha256").update(
    lines.map((l) => l).join("\n") + (lines.length ? "\n" : ""),
  );
  const sha = hash.digest("hex");
  let parseOk = true;
  try {
    for (const l of lines) JSON.parse(l);
  } catch {
    parseOk = false;
  }
  const ok = parseOk && lines.length === info.rows && sha === info.sha256;
  verification.tables[table] = { lines: lines.length, sha256: sha, jsonl_parse_ok: parseOk, ok };
  if (!ok) verification.ok = false;
}

writeFileSync(join(root, "verification", "report.json"), JSON.stringify(verification, null, 2));
writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`verification: ${verification.ok ? "PASS" : "FAIL"}`);
console.log(`tables      : ${tables.length}`);
if (!verification.ok) fail("verification failed — inspect verification/report.json");
console.log("DONE");