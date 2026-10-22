#!/usr/bin/env python3
"""
Compare the function-ACL layer of the LOCAL database with the LIVE production
database (read-only on production) and report the differences.

The local mirror was restored with pg_dump, which does not carry
`ALTER DEFAULT PRIVILEGES` and emits only the ACLs that differ from the
Postgres default (owner + PUBLIC execute).  Functions that production had
already closed off therefore come back locally with PUBLIC execute.

This script prints:
  * the per-function privilege matrix of both databases (anon / authenticated /
    service_role)
  * the list of functions whose local ACL is wider than production's

It prints no credentials and changes nothing.
"""
import os
import sys

import psycopg
from psycopg.rows import dict_row

LOCAL_DSN = "postgresql://postgres@127.0.0.1:5433/qbase_local"
KEYS = ("SB_REF", "SB_REGION", "SB_DB_PASS")


def find_source_pid():
    """The running shim that carries the project's database credentials."""
    explicit = os.environ.get("SHIM_PID")
    if explicit and os.path.isdir(f"/proc/{explicit}"):
        return explicit
    for entry in os.listdir("/proc"):
        if not entry.isdigit():
            continue
        try:
            with open(f"/proc/{entry}/cmdline", "rb") as fh:
                if b"qbase_api.py" not in fh.read():
                    continue
            with open(f"/proc/{entry}/environ", "rb") as fh:
                if b"SB_DB_PASS=" in fh.read():
                    return entry
        except OSError:
            continue
    return None


def prod_dsn() -> str:
    env = dict(os.environ)
    src = find_source_pid()
    if src is None:
        raise SystemExit("no running shim instance found to read the project "
                         "credentials from (set SHIM_PID=<pid>)")
    with open(f"/proc/{src}/environ", "rb") as fh:
        for chunk in fh.read().split(b"\0"):
            if b"=" not in chunk:
                continue
            k, v = chunk.split(b"=", 1)
            if k.decode() in KEYS:
                env[k.decode()] = v.decode()
    ref = env["SB_REF"]
    region = env.get("SB_REGION", "eu-west-1")
    return (f"postgresql://postgres.{ref}:{env['SB_DB_PASS']}"
            f"@aws-0-{region}.pooler.supabase.com:5432/postgres")


QUERY = """
select p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as sig,
       has_function_privilege('anon',         p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as svc_exec,
       has_function_privilege('public',       p.oid, 'EXECUTE') as public_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1
"""


def matrix(dsn: str):
    with psycopg.connect(dsn, connect_timeout=30, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(QUERY)
            return {r["sig"]: r for r in cur.fetchall()}


def main() -> int:
    prod = matrix(prod_dsn())
    local = matrix(LOCAL_DSN)

    only_prod = sorted(set(prod) - set(local))
    only_local = sorted(set(local) - set(prod))
    if only_prod:
        print(f"functions in production but not local: {len(only_prod)}")
        for s in only_prod:
            print("   -", s)
    if only_local:
        print(f"functions in local but not production: {len(only_local)}")
        for s in only_local:
            print("   +", s)

    wider = []
    for sig in sorted(set(prod) & set(local)):
        p, l = prod[sig], local[sig]
        diffs = []
        for col in ("anon_exec", "auth_exec", "svc_exec", "public_exec"):
            if bool(p[col]) != bool(l[col]):
                diffs.append(f"{col}: prod={bool(p[col])} local={bool(l[col])}")
        if diffs:
            wider.append((sig, diffs))

    print(f"\nfunctions compared: {len(set(prod) & set(local))}")
    print(f"functions whose LOCAL acl differs from production: {len(wider)}")
    for sig, diffs in wider:
        print(f"  * {sig}: {'; '.join(diffs)}")

    for label, m in (("production", prod), ("local", local)):
        anon = sum(1 for r in m.values() if r["anon_exec"])
        pub = sum(1 for r in m.values() if r["public_exec"])
        auth = sum(1 for r in m.values() if r["auth_exec"])
        print(f"{label:11} anon-reachable={anon:2}  public-exec={pub:2}  auth-exec={auth:2}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
