#!/bin/bash
# Rebuild the LOCAL database from the project backup dump.
#
#   source dump : /home/kepv/QMS_BACKUP/pre-acl-hardening-20261022/01_schema_and_data.sql
#   target      : postgresql://postgres@127.0.0.1:5433/qbase_local  (Postgres 16.8)
#
# The dump is a pg_dump 17.7 of the live project (PG 17.11).  Two things have
# to be adjusted for the local PG 16 target:
#   * `\restrict` / `\unrestrict` (a PG 17.6+ psql feature) are stripped
#   * `SET transaction_timeout` (PG 17 only) is stripped
#   * `CREATE SCHEMA public` is dropped (the schema already exists)
#
# The `auth` schema is NOT in the dump (Supabase owns it), so
# seed/01_auth_scaffold.sql recreates an equivalent one BEFORE the dump runs
# — the restored policies call auth.uid().
#
# After this script: the four Prime migrations (07..10) and the seed/04 ACL
# parity file are applied, and seed/02_seed_auth_users.py creates the local
# login accounts.
set -eu

REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"
WORK="/tmp/qbase-local/seed"
DUMP="${1:-/home/kepv/QMS_BACKUP/pre-acl-hardening-20261022/01_schema_and_data.sql}"
PGHOST="127.0.0.1"
PGPORT="5433"
PGUSER="postgres"
DB="qbase_local"

mkdir -p "$WORK"

echo "1/4  preparing the restore script from $DUMP"
grep -vE '^\\(un)?restrict ' "$DUMP" \
  | grep -vE '^CREATE SCHEMA public;$' \
  | grep -vE '^SET transaction_timeout = 0;$' > "$WORK/public_restore.sql"

cat "$TOOLS/seed/00_extensions.sql" \
    "$TOOLS/seed/01_auth_scaffold.sql" \
    "$WORK/public_restore.sql" > "$WORK/restore.sql"

echo "2/4  (re)creating the local database $DB"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
  -c "drop database if exists $DB;" -c "create database $DB;"

echo "3/4  restoring"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 \
  -f "$WORK/restore.sql" > "$WORK/restore.log" 2>&1 || {
    tail -20 "$WORK/restore.log"; exit 1; }

echo "4/4  applying the Prime migrations + local ACL parity"
for f in 20260929_07_function_acl_hardening.sql \
         20260929_08_record_draft_create_audit_fix.sql \
         20260929_09_table_grant_layer.sql \
         20260929_10_legacy_policy_cleanup.sql; do
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 \
    -f "$REPO/supabase/migrations/prime/$f" > "$WORK/$(basename "$f").log" 2>&1
  echo "      applied $f"
done
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 \
  -f "$TOOLS/seed/04_local_acl_parity.sql" > "$WORK/04_acl_parity.log" 2>&1 \
  || echo "      NOTE: 04_local_acl_parity.sql was refused (it grants EXECUTE to"
  echo "            service_role on all public functions) — see the README."

echo
echo "now run:  python3 $TOOLS/seed/02_seed_auth_users.py"
echo "         bash $TOOLS/start-local.sh"
