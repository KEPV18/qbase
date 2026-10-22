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
| public functions | 54 |
| RLS policies | 101 (18 legacy ones dropped by migration 10) |
| records | 318 |
| audit_log | 6523 |
| profiles / user_roles | 4 / 4 |
| auth.users | 4 (created locally, see below) |

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
# 1. rebuild the local database from the project backup
bash tools/local-stack/prepare.sh

# 2. create the local login accounts (writes LOCAL_LOGIN.txt, mode 0600)
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

## Notes

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
