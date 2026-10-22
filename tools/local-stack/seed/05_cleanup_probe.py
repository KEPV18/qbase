#!/usr/bin/env python3
"""
Remove the write-probe residue from the LOCAL database.

The end-to-end check created one draft record (through the app's own
`record_draft_create` RPC) and the audit rows its trigger wrote.  This script
deletes exactly those rows again, so the local mirror is back to the row
counts of the restored snapshot.

It touches the LOCAL database only (127.0.0.1:5433/qbase_local), deletes only
rows carrying the probe marker, and prints the final counts.
"""
import psycopg

DSN = "postgresql://postgres@127.0.0.1:5433/qbase_local"
MARKER = "LOCAL STACK PROBE"

with psycopg.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute("select id from public.records where form_name ilike %s", (MARKER,))
        ids = [r[0] for r in cur.fetchall()]
        # audit_log rows are protected by a delete-blocking trigger; the same
        # disable/delete/enable dance the API shim does
        cur.execute("alter table public.audit_log disable trigger trigger_prevent_audit_delete")
        if ids:
            cur.execute("delete from public.audit_log where record_id = any(%s)", (ids,))
            cur.execute("delete from public.records where id = any(%s)", (ids,))
        cur.execute("alter table public.audit_log enable trigger trigger_prevent_audit_delete")
    conn.commit()

with psycopg.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute(
            """select 'records', count(*) from public.records
               union all select 'audit_log', count(*) from public.audit_log
               union all select 'record_versions', count(*) from public.record_versions
               union all select 'notifications', count(*) from public.notifications
               union all select 'profiles', count(*) from public.profiles
               union all select 'user_roles', count(*) from public.user_roles
               union all select 'auth.users', count(*) from auth.users
               union all select 'probe residue',
                   (select count(*) from public.records where form_name ilike %s)
               order by 1""", (MARKER,))
        for name, n in cur.fetchall():
            print(f"{name:16} {n}")
