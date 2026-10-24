# QBase — local Supabase-like stack

A full working copy of QBase that runs entirely on this machine: Postgres,
an auth schema, a PostgREST-compatible API, and the built SPA. Nothing in it
talks to a hosted Supabase project.

```
browser ──> 127.0.0.1:5211  (static SPA, dist-local)
              └─> 127.0.0.1:54351  (CORS proxy)
                    └─> 127.0.0.1:54350  (PostgREST-compatible API, qbase_api.py)
                          └─> 127.0.0.1:5433/qbase_local  (Postgres 16.8)
```

## What is in the local database

The same data as the live project `hkkdbxvmvvcxpgfqlrnp`, restored from the
project backup and brought to the current migration state:

| | |
|---|---|
| public tables | 18 |
| public functions | 67 (60 + the 7 of migration 20) |
| RLS policies | 93 (18 legacy ones dropped by migration 10) |
| records | 321 |
| audit_log | 6534 |
| profiles / user_roles | 6 / 6 |
| auth.users | 6 (created locally, see below) |

## The schema is IN the repository; the data is not

`seed/schema.sql` is the local environment's own copy of the schema: every
table, column, constraint, index, trigger, RLS policy, grant and function of
the `public` schema, with **no data**. It is what makes the environment
independent — `prepare.sh` rebuilds the database from the repository alone,
and nothing outside the repository is needed.

The **data** is a separate, optional step. The register's rows carry real
names and real e-mail addresses, so they are not committed; they live in a
data-only dump outside the repository:

```
$QBASE_DATA_DUMP            (default: /home/kepv/QMS_BACKUP/local-rebuild/01_data.sql)
```

To refresh the data dump after the live project changes:

```bash
pg_dump --data-only --schema=public <connection-string> > /home/kepv/QMS_BACKUP/local-rebuild/01_data.sql
```

To refresh the **schema** file after a migration has been applied locally:

```bash
pg_dump --schema-only --no-owner --schema=public \
  -h 127.0.0.1 -p 5433 -U postgres -d qbase_local \
  | grep -vE '^\\(un)?restrict ' | grep -vE '^CREATE SCHEMA public;$' \
  > tools/local-stack/seed/schema.sql
```

Without a data dump the environment is still complete and the app runs — the
register is simply empty, and `prepare.sh` says so at the end.

## The `auth` schema

`pg_dump` of a Supabase project does not carry the `auth` schema, but the
restored policies and function bodies call `auth.uid()`. `seed/01_auth_scaffold.sql`
recreates the shape Supabase uses (`auth.users`, `auth.identities`,
`auth.instances`, `auth.roles`, and the `auth.uid()` / `auth.role()` /
`auth.email()` / `auth.jwt()` helpers).

`seed/02_seed_auth_users.py` then creates the login accounts **from the
restored `public.profiles` table**, with a bcrypt password generated locally.
No credential hash is ever copied from production. The generated credentials
are written to `/tmp/qbase-local/LOCAL_LOGIN.txt` (mode 0600) and are never
printed.

## Why a dump is not enough

Two things `pg_dump` does not carry, both of which bit the real restore:

1. **`ALTER DEFAULT PRIVILEGES`** — the project granted its table privileges
   through project-level default privileges, so a plain restore left every
   public table with no ACL at all and PostgREST answered `42501` for
   everything. Migration 09 re-creates that layer.
2. **The `auth` schema** — see above.

The same applies to functions: `service_role` holds EXECUTE on all 54 public
functions in the live project, because the default privileges granted it to
each function at creation time. `seed/04_local_acl_parity.sql` restores that
grant locally (it is the trusted backend role, and it was the only
difference left between the two databases' function ACLs). It is applied:
the local database now reports 54/54 functions with `service_role` EXECUTE,
0 with `anon` EXECUTE and 50 with `authenticated` EXECUTE.

## Bringing it up

```bash
# 1. rebuild the local database from the repository (schema + the optional
#    data dump), apply the prime migrations and the local ACL parity
bash tools/local-stack/prepare.sh

# 2. create the local login accounts (writes LOCAL_LOGIN.txt, mode 0600)
#    — prepare.sh already does this when it loaded a data dump; run it
#    by hand when the register is empty
python3 tools/local-stack/seed/02_seed_auth_users.py

# 3. build the SPA against the local API
cd /home/kepv/qbase-remediation
ANON=$(grep -m1 '^VITE_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)
VITE_SUPABASE_URL=http://127.0.0.1:54351 VITE_SUPABASE_ANON_KEY="$ANON" \
  npx vite build --outDir dist-local --emptyOutDir

# 4. start the API, the proxy and the preview
bash tools/local-stack/start-local.sh
```

Then open <http://127.0.0.1:5210> and sign in with an account from
`/tmp/qbase-local/LOCAL_LOGIN.txt`.

The stack dies with the session; `start-local.sh` brings it back.

## The two stacks — do not mix them up

There are two static previews on this machine, and each one has its own
database **and its own password**. Every preview stamps a banner in the
top-right corner saying which one it is.

| preview | build | talks to | password |
|---|---|---|---|
| <http://127.0.0.1:5210> | `dist-local` | the local database (`127.0.0.1:5433/qbase_local`) via `54351` | `/tmp/qbase-local/LOCAL_LOGIN.txt` |
| <http://127.0.0.1:5211> | `dist-local` | the same local build | same file |
| <http://127.0.0.1:5212> | `dist` | the live project `hkkdbxvmvvcxpgfqlrnp` via `54341` | the production one (restore notes) |

**5210 and 5211 both serve the LOCAL stack on purpose.** 5210 is the port
that gets opened, and it used to point at the live project — so every local
password answered `400 invalid_grant` there, which is indistinguishable
from a broken login. The live stack moved to 5212.

Signing in to 5212 with the local password still answers `400
invalid_grant`, because the local password was generated locally and
exists nowhere else — that is the expected answer, not a fault. The API
port in the browser's console tells you which stack you are on:
`54351` = local, `54343` = live.

## Verifying it

```bash
node tools/local-stack/measure-local.mjs
```

Signs in with the local credential, reads the rendered dashboard / audit /
forms-registry surfaces, counts console errors, and prints every host the
browser contacted (it must be only `127.0.0.1:5211` and `127.0.0.1:54351`).

`seed/03_diff_function_acl.py` compares the local function ACL layer with the
live project (read-only on production).

`seed/05_cleanup_probe.py` removes the residue of a write probe.

### Proving that the two compliance engines agree

```bash
npx tsx tools/local-stack/verify-compliance-parity.ts
```

The compliance model exists twice on purpose: once in TypeScript
(`src/lib/compliancePeriods.ts`, the engine the pages that do not go
through the RPC read) and once in PL/pgSQL (`public.compliance_map`, the
engine the **server** runs, so the verdict comes from the server's view of
the register rather than from a snapshot the browser happens to hold).

Two implementations of one model is a liability, not a feature — they drift,
and then the dashboard says "5 overdue" while the audit page says "8". This
script runs BOTH engines over the whole local register at one fixed instant
and compares them field by field. Any difference is printed and the script
exits 1.

It is read-only: it reads the local database and writes nothing. The fixed
instant can be moved with `QBASE_PARITY_AS_OF`, and the engine's calendar
with the machine's own offset — the script sends the same instant and the
same offset to the server that the client would.

The constants the two engines share — the grace days, the one-year
look-back, the order a record's month is decided in, the order a frequency
string is read in — are asserted without a database by
`src/lib/__tests__/serverComplianceParity.test.ts`, so CI runs that half on
every push.

### Proving that the verdict is the server's, in a browser

```bash
node tools/local-stack/verify-server-compliance-path.mjs
```

The compliance model is computed by the server (`public.compliance_map`,
`public.records_page`), so the browser must **ask** and must not **download
the register**. This script signs in with the local credential, opens the
four pages that answer a compliance question — the dashboard, the audit
dashboard, the forms registry and the compliance report — and checks three
things:

1. each of them calls the server (`compliance_map`, `records_page`,
   `dashboard_stats`);
2. none of them reads the whole table — the `records?select=*` download is
   gone, and the list behind the audit table is one filtered page at a time;
3. the pages render the server's answer with **no console error** — it also
   opens the audit's *Overdue* tab, counts the forms the server sent, and
   clicks one to prove the detailed report opens.

It reads only, prints aggregates (request counts, row counts, console-error
strings — never a serial, a name, an e-mail or a field value), and exits 1
if any of the three claims fails. It needs a browser and the running stack,
so it is a tool for the hand, not a CI step.

### Proving that a rebuild reproduces the environment

```bash
# rebuild into a scratch database, side by side with the live local one
QBASE_LOCAL_DB=qbase_rebuild_test QBASE_SKIP_SEED_USERS=1 \
  bash tools/local-stack/prepare.sh

# compare the two structures, line by line
bash tools/local-stack/compare-rebuild.sh
```

`compare-rebuild.sh` reads both databases through `fingerprint.sql` — the
tables, the columns, the constraints, the indexes, the triggers, the RLS
policies, the table grants, and the functions with their bodies and their
ACLs — and diffs the two. Measured on 2026-10-24: **IDENTICAL**, 683 lines
on both sides, with 321 records, 6 profiles and 6534 audit rows.

The migrations are idempotent, which is what makes the second run a
no-op: every one of them can be applied twice, and the state afterwards is
the same. (Migration 15 was not — it created two policies without dropping
them first, so a rebuild died halfway. It is fixed.)

## Notes

* **The shim's CORS preflight has to allow what the client sends.**
  `@supabase/postgrest-js` puts `Accept-Profile: public` on every read and
  `Content-Profile: public` on every write, because supabase-js's default
  schema is `public`. The shim's allow-list
  (`qbase_api.py` → `ALLOWED_REQUEST_HEADERS`) names both, and it must
  keep naming them: a header the preflight does not allow makes Chrome
  refuse the **preflight**, so the request is never sent and the page
  silently shows nothing. The CORS proxy in front of the shim answers its
  own preflight with `*` and hides the gap — which is why a build pointed
  straight at a shim port (the runtime address override allows it, and the
  local stack does it) is the one that breaks.
  `src/lib/__tests__/localStackCors.test.ts` pins the list, and checks it
  against the installed client, so a postgrest-js upgrade that starts
  sending a new header fails the build rather than the browser.
* The shim connects as the `postgres` role, so RLS is not enforced locally —
  the same way the live stack behaves through the pooler. The privilege layer
  is still present in the local database and can be inspected directly.
* `qbase_api.py` sets the caller's JWT claims on the connection
  (`request.jwt.claims`) before every statement, the way PostgREST does, so
  `auth.uid()` resolves inside the restored functions and writes stamp the
  right actor.
* The shim's credentials (JWT secret, anon/service keys) are inherited from a
  running shim instance's `/proc/<pid>/environ` by `run-shim.py`; no secret is
  written to disk, to argv, or to a transcript.
