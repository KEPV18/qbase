#!/usr/bin/env python3
"""
Seed the LOCAL auth.users table for the local Supabase-like stack.

Source of truth: the restored `public.profiles` + `public.user_roles` tables
(the local copy of the production data).  Passwords are generated HERE, with
bcrypt (pgcrypto `crypt`), so no credential hash is ever copied from the
production project — the local copy is a separate, self-contained sandbox.

The login credential of the admin account is written to
/tmp/qbase-local/LOCAL_LOGIN.txt (mode 0600) and is never printed here.
"""
import os
import secrets
import string
import sys

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

DSN = os.environ.get("QBASE_LOCAL_DSN", "postgresql://postgres@127.0.0.1:5433/qbase_local")
OUT = os.environ.get("QBASE_LOCAL_LOGIN_FILE", "/tmp/qbase-local/LOCAL_LOGIN.txt")

ALPHABET = string.ascii_letters + string.digits + "-_"


def gen_password(n: int = 20) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


def main() -> int:
    with psycopg.connect(DSN, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """select p.user_id, p.email, p.display_name, p.department,
                          coalesce((select role from public.user_roles
                                     where user_id = p.user_id
                                     order by created_at desc limit 1), 'user') as role
                   from public.profiles p
                   order by p.created_at nulls last"""
            )
            people = cur.fetchall()
            if not people:
                print("no profiles to seed from", file=sys.stderr)
                return 1

            cur.execute("delete from auth.identities")
            cur.execute("delete from auth.users")

            creds = []
            for p in people:
                pw = gen_password()
                cur.execute("select crypt(%s, gen_salt('bf'))", (pw,))
                pw_hash = list(cur.fetchone().values())[0]
                cur.execute(
                    """insert into auth.users (instance_id, id, aud, role, email,
                           encrypted_password, email_confirmed_at, raw_app_meta_data,
                           raw_user_meta_data, created_at, updated_at, last_sign_in_at,
                           is_super_admin, phone_change, phone_change_token,
                           email_change_token_current, email_change_confirm_status,
                           reauthentication_token, reauthentication_sent_at,
                           is_sso_user, is_anonymous)
                       values ((select id from auth.instances limit 1), %s, 'authenticated',
                           'authenticated', %s, %s, now(),
                           '{"provider":"email","providers":["email"]}'::jsonb,
                           %s::jsonb, now(), now(), now(), false, '', '', '', 0, '', now(),
                           false, false)""",
                    (p["user_id"], p["email"], pw_hash,
                     Jsonb({"full_name": p["display_name"] or "",
                            "department": p["department"] or ""})))
                cur.execute(
                    """insert into auth.identities (user_id, provider_id, identity_data,
                           provider, last_sign_in_at, created_at, updated_at, email)
                       values (%s, %s, %s::jsonb, 'email', now(), now(), now(), %s)""",
                    (p["user_id"], str(p["user_id"]),
                     Jsonb({"sub": str(p["user_id"]), "email": p["email"]}), p["email"]))
                creds.append({
                    "email": p["email"], "password": pw, "role": p["role"],
                    "display_name": p["display_name"], "department": p["department"],
                })
        conn.commit()

    # the credential file is the only place the passwords exist
    lines = [
        "QBase — LOCAL Supabase-like stack login",
        "=======================================",
        "",
        "Preview : http://127.0.0.1:5211",
        "API     : http://127.0.0.1:54351  (CORS proxy) -> 54350 (shim) -> "
        "127.0.0.1:5433/qbase_local (Postgres 16.8)",
        "",
        "These credentials exist ONLY in the local database. They are not the",
        "production credentials and do not work against production.",
        "",
    ]
    for c in creds:
        lines += [
            f"- {c['email']}  (role: {c['role']})",
            f"  password: {c['password']}",
            f"  name: {c['display_name'] or '-'}   department: {c['department'] or '-'}",
            "",
        ]
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    os.chmod(OUT, 0o600)

    print(f"seeded {len(creds)} local users into auth.users "
          f"(admin role present: {any(c['role'] == 'admin' for c in creds)})")
    print(f"credentials written to {OUT} (mode 0600) — not printed here")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
