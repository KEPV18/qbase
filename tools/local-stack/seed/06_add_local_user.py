#!/usr/bin/env python3
"""
Add ONE extra account to the LOCAL auth stack (sandbox only).

The four accounts seeded by 02_seed_auth_users.py carry 20-character random
passwords, which is right for a credential file but painful to type by hand.
This script creates a further account with a password the owner chooses (or
one that is generated and printed once), and wires it into all four tables the
app reads, so it behaves exactly like a seeded account:

    public.profiles    (the app fetches the profile by user_id)
    public.user_roles  (the role; 'admin' or a department class)
    auth.users         (the credential itself, bcrypt-hashed locally)
    auth.identities    (the email identity the shim looks up)

Nothing here touches production: the DSN is the local database, and the
password hash is generated on this machine by pgcrypto's crypt(). The
account is appended to /tmp/qbase-local/LOCAL_LOGIN.txt (mode 0600).

    python3 06_add_local_user.py --email tester@qbase.local \
        --display-name "Local Tester" --role admin --password '...'
"""
import argparse
import os
import re
import secrets
import string
import sys

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

DSN = "postgresql://postgres@127.0.0.1:5433/qbase_local"
OUT = "/tmp/qbase-local/LOCAL_LOGIN.txt"
ALPHABET = string.ascii_letters + string.digits + "-_"


def gen_password(n: int = 12) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


BLOCK_RE = re.compile(
    r"^- (?P<email>\S+)\s+\(role: (?P<role>\w+)\)\n"
    r"  password: (?P<password>\S+)\n"
    r"  name: .*\n",
    re.MULTILINE,
)


def append_to_credential_file(email: str, password: str, role: str,
                               display_name: str) -> None:
    """Upsert the account's block.

    A reset must REPLACE the existing block, not append a second one: two
    blocks for the same address leave the first (stale) password in the
    file, and every reader that takes the first match then signs in with a
    password that no longer exists — a 400 invalid_grant that looks like a
    broken login.
    """
    block = (
        f"- {email}  (role: {role})\n"
        f"  password: {password}\n"
        f"  name: {display_name or '-'}   department: -\n"
    )

    text = ""
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            text = fh.read()

    replaced = False
    out_lines = []
    pos = 0
    for m in BLOCK_RE.finditer(text):
        if m.group("email").lower() == email.lower():
            out_lines.append(text[pos:m.start()])
            out_lines.append(block)
            pos = m.end()
            replaced = True
    out_lines.append(text[pos:])
    text = "".join(out_lines)

    if not replaced:
        if text and not text.endswith("\n"):
            text += "\n"
        text += block

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(text)
    os.chmod(OUT, 0o600)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", required=True)
    ap.add_argument("--display-name", default="Local User")
    ap.add_argument("--role", default="user", help="admin | dept_head | user | ...")
    ap.add_argument("--department", default=None)
    ap.add_argument("--password", default=None,
                    help="omit to generate a 12-character one")
    ap.add_argument("--reset-password", action="store_true",
                    help="set the password of an EXISTING local account "
                         "instead of creating a new one")
    args = ap.parse_args()

    email = args.email.strip().lower()
    password = args.password or gen_password()
    if len(password) < 8:
        print("password must be at least 8 characters", file=sys.stderr)
        return 1

    with psycopg.connect(DSN, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("select id from auth.instances limit 1")
            inst = cur.fetchone()
            cur.execute("select crypt(%s, gen_salt('bf')) as h", (password,))
            pw_hash = cur.fetchone()["h"]

            if args.reset_password:
                cur.execute(
                    """update auth.users set encrypted_password = %s,
                               updated_at = now()
                         where lower(email) = %s
                     returning id, (select role from public.user_roles
                                     where user_id = auth.users.id) as role""",
                    (pw_hash, email))
                row = cur.fetchone()
                if not row:
                    print(f"no local account for {email}", file=sys.stderr)
                    return 1
                conn.commit()
                append_to_credential_file(email, password, row["role"] or "?",
                                          args.display_name)
                print(f"password reset for: {email}  (role: {row['role']})")
                print(f"password: {password}")
                print(f"also appended to {OUT} (mode 0600)")
                return 0

            cur.execute("select id from public.profiles where lower(email) = %s",
                        (email,))
            if cur.fetchone():
                print(f"a profile already exists for {email}", file=sys.stderr)
                return 1
            cur.execute("select id from auth.users where lower(email) = %s",
                        (email,))
            if cur.fetchone():
                print(f"an auth user already exists for {email}", file=sys.stderr)
                return 1

            cur.execute("select gen_random_uuid() as uid")
            user_id = str(cur.fetchone()["uid"])

            # public.profiles — the row the app reads by user_id
            cur.execute(
                """insert into public.profiles
                       (id, user_id, email, display_name, is_active,
                        created_at, updated_at, department)
                   values (gen_random_uuid(), %s, %s, %s, true, now(), now(), %s)
                   returning id""",
                (user_id, email, args.display_name, args.department))
            cur.execute(
                """insert into public.user_roles (user_id, role, department)
                   values (%s, %s, %s)""",
                (user_id, args.role, args.department))
            cur.execute(
                """insert into auth.users (instance_id, id, aud, role, email,
                           encrypted_password, email_confirmed_at,
                           raw_app_meta_data, raw_user_meta_data,
                           created_at, updated_at, last_sign_in_at,
                           is_super_admin, phone_change, phone_change_token,
                           email_change_token_current, email_change_confirm_status,
                           reauthentication_token, reauthentication_sent_at,
                           is_sso_user, is_anonymous)
                   values (%s, %s, 'authenticated', 'authenticated', %s, %s, now(),
                           '{"provider":"email","providers":["email"]}'::jsonb,
                           %s::jsonb, now(), now(), now(), false, '', '', '', 0, '',
                           now(), false, false)""",
                (inst["id"], user_id, email, pw_hash,
                 Jsonb({"full_name": args.display_name,
                        "department": args.department or ""})))
            cur.execute(
                """insert into auth.identities (user_id, provider_id, identity_data,
                           provider, last_sign_in_at, created_at, updated_at, email)
                   values (%s, %s, %s::jsonb, 'email', now(), now(), now(), %s)""",
                (user_id, user_id,
                 Jsonb({"sub": user_id, "email": email}), email))
        conn.commit()

    append_to_credential_file(email, password, args.role, args.display_name)
    # the owner asked for these credentials to type in by hand
    print(f"created local account: {email}  (role: {args.role})")
    print(f"password: {password}")
    print(f"also appended to {OUT} (mode 0600)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
