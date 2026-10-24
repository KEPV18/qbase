#!/bin/bash
# Rebuild the LOCAL database from the repository.
#
#   target      : postgresql://postgres@127.0.0.1:5433/qbase_local  (Postgres 16.8)
#   schema      : tools/local-stack/seed/schema.sql   (in the repository)
#   data        : $QBASE_DATA_DUMP                   (outside the repository)
#
# WHY THE SCHEMA IS IN THE REPOSITORY
# ------------------------------------
# The rebuild used to read a dump from a path the project does not own:
#
#     /home/kepv/QMS_BACKUP/pre-acl-hardening-20261022/01_schema_and_data.sql
#
# so the environment could not be rebuilt from the repository alone, and a
# missing file turned into a cryptic `psql` error.  The schema now lives in
# the repository and the DATA stays outside it — the register's rows carry
# real names and real e-mail addresses, and they are not committed.
#
# The DATA is therefore optional but never silent: without it the register
# is empty, and this script says so, loudly, at the end.
#
# Everything the script needs is inside the repository:
#
#   * seed/00_extensions.sql    the `extensions` schema and pgcrypto
#   * seed/01_auth_scaffold.sql the `auth` schema Supabase owns
#   * seed/schema.sql           every table, function, policy and grant
#   * the prime migrations      applied in order, on top
#   * seed/04_local_acl_parity.sql  the local service_role grants
#
# The migrations are applied AFTER the schema, and they are idempotent: a
# rebuild that runs them twice ends in the same state.
set -eu

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS="$REPO/tools/local-stack"
SEED="$TOOLS/seed"
WORK="${QBASE_LOCAL_WORK:-/tmp/qbase-local/seed}"

DB="${QBASE_LOCAL_DB:-qbase_local}"
PGHOST="${QBASE_PGHOST:-127.0.0.1}"
PGPORT="${QBASE_PGPORT:-5433}"
PGUSER="${QBASE_PGUSER:-postgres}"
DATA_DUMP="${QBASE_DATA_DUMP:-/home/kepv/QMS_BACKUP/local-rebuild/01_data.sql}"

PSQL="psql -h $PGHOST -p $PGPORT -U $PGUSER -v ON_ERROR_STOP=1"

mkdir -p "$WORK"

if [ ! -f "$SEED/schema.sql" ]; then
  echo "ERROR: $SEED/schema.sql is missing — the local schema is part of the repository." >&2
  exit 1
fi

# ── 1. the roles the local database needs ──────────────────────────────────
# The grants in the schema name `anon`, `authenticated` and `service_role`.
# On a machine whose cluster has never had them, the restore would fail on
# the first GRANT — so they are created here, if they are not there.
echo "1/6  making sure the roles exist"
$PSQL -d postgres <<'SQL' > "$WORK/roles.log" 2>&1
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;
SQL
echo "      anon / authenticated / service_role"

# ── 2. the database ────────────────────────────────────────────────────────
echo "2/6  (re)creating the local database $DB"
$PSQL -d postgres -c "drop database if exists $DB;" -c "create database $DB;"

# ── 3. the schema, from the repository ─────────────────────────────────────
echo "3/6  restoring the schema from $SEED/schema.sql"
cat "$SEED/00_extensions.sql" \
    "$SEED/01_auth_scaffold.sql" \
    "$SEED/schema.sql" > "$WORK/schema.sql"
$PSQL -d "$DB" -f "$WORK/schema.sql" > "$WORK/schema.log" 2>&1 || {
  tail -20 "$WORK/schema.log"; exit 1; }
echo "      $(grep -c '^CREATE TABLE' "$WORK/schema.log" 2>/dev/null || echo 0) tables"

# ── 4. the prime migrations, in order ──────────────────────────────────────
echo "4/6  applying the prime migrations"
#
# The list is the full set, in the order they were written.  A rebuild that
# skipped one of them would restore a state the live project is not in:
#   * 20260929_07 widens the notification enums and adds the SECURITY
#     DEFINER overload of create_notifications_batch — without it every
#     notification insert fails with 400.
#   * 20261023_11 replaces the two `USING (true)` read policies on
#     `records`, so a rebuild would make the register world-readable again.
#   * 20261023_12 closes admin_list_users() and drops the blanket SELECT
#     policies on `profiles` and `user_roles`.
#   * 20261023_13 stops serving the legacy `profiles.password` column.
#   * 20261023_14 lifts the project id into the `records.project_id` column.
#   * 20261023_15 scopes the audit trail and the version history to the
#     records the caller can read, and fixes the "your own records" clause
#     that could never match the email-shaped `created_by`.
#   * 20261023_16 creates the two RPCs the client calls and no migration
#     created — without it a rebuild has no create-record and no
#     delete-record function.
#   * 20261023_17 creates the two bulk functions the import and the
#     restore go through.
#   * 20261024_18 makes the server decide who created a record.
#   * 20261024_19 makes the required-field rule follow the catalogue — 31
#     of the 36 forms could not be created without it, and a restore
#     dropped 216 of the 316 live records.
#   * 20261024_20 creates the two functions the compliance verdict is
#     computed by (compliance_map, records_page) — without it a rebuild
#     has no server-side engine, and the client falls back to downloading
#     the whole register.
for f in 20260929_07_function_acl_hardening.sql \
         20260929_08_record_draft_create_audit_fix.sql \
         20260929_09_table_grant_layer.sql \
         20260929_10_legacy_policy_cleanup.sql \
         20261022_07_notification_contract.sql \
         20261023_11_records_read_policy.sql \
         20261023_12_authz_closure.sql \
         20261023_13_profiles_password_column.sql \
         20261023_14_record_project_link.sql \
         20261023_15_audit_and_version_scope.sql \
         20261023_16_missing_rpc_migrations.sql \
         20261023_17_bulk_record_ops.sql \
         20261024_18_create_record_author.sql \
         20261024_19_required_fields_follow_the_catalogue.sql \
         20261024_20_server_side_compliance.sql; do
  $PSQL -d "$DB" -f "$REPO/supabase/migrations/prime/$f" > "$WORK/$(basename "$f").log" 2>&1
  echo "      applied $f"
done

# ── 5. the local ACL parity ────────────────────────────────────────────────
echo "5/6  applying the local ACL parity"
if ! $PSQL -d "$DB" -f "$SEED/04_local_acl_parity.sql" > "$WORK/04_acl_parity.log" 2>&1; then
  echo "      NOTE: 04_local_acl_parity.sql was refused (it grants EXECUTE to"
  echo "            service_role on all public functions) — see the README."
fi

# ── 6. the data, and the local login accounts ──────────────────────────────
echo "6/6  loading the register's rows"
if [ -f "$DATA_DUMP" ]; then
  # The rows have circular foreign keys (document_metadata), so the
  # constraints are not enforced while they go in.  Everything else — the
  # policies, the grants, the functions — is already in place.
  {
    echo "set session_replication_role = replica;"
    # `\restrict` / `\unrestrict` are a psql 17.6+ feature that the local
    # psql 16 does not know; they are stripped so a dump made by a newer
    # pg_dump still loads here.
    grep -vE '^\\(un)?restrict ' "$DATA_DUMP" || true
    echo "set session_replication_role = origin;"
  } > "$WORK/data.sql"
  $PSQL -d "$DB" -f "$WORK/data.sql" > "$WORK/data.log" 2>&1 || {
    tail -20 "$WORK/data.log"; exit 1; }
  echo "      loaded $DATA_DUMP"

  if [ -f "$SEED/02_seed_auth_users.py" ] && [ "${QBASE_SKIP_SEED_USERS:-0}" != "1" ]; then
    # The seeder needs psycopg, which lives in the same Python the local
    # shim uses.
    SEED_PY="${QBASE_PYTHON:-/home/kepv/.local/share/pipx/venvs/qwenpaw/bin/python3}"
    [ -x "$SEED_PY" ] || SEED_PY="python3"
    QBASE_LOCAL_DSN="postgresql://postgres@$PGHOST:$PGPORT/$DB" \
      "$SEED_PY" "$SEED/02_seed_auth_users.py" > "$WORK/seed_users.log" 2>&1 \
      && echo "      seeded the local login accounts" \
      || echo "      NOTE: the login accounts were not seeded — see $WORK/seed_users.log"
  fi
else
  echo "      NOTE: $DATA_DUMP is not there, so the register is EMPTY."
  echo "            The environment is complete and the app runs; only the"
  echo "            register's rows are missing.  To bring them back, point"
  echo "            QBASE_DATA_DUMP at a data-only dump:"
  echo "              pg_dump --data-only --schema=public <connection> > data.sql"
fi

echo
echo "the local database is ready:  postgresql://postgres@$PGHOST:$PGPORT/$DB"
echo "now run:  bash $TOOLS/start-local.sh"
