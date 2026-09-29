#!/bin/bash
# prime-local/verify.sh — TEST-ONLY driver (isolated local Postgres; never production)
set -u
cd "$(dirname "$0")"

PG=~/.local/opt/postgresql-16.15.0-x86_64-unknown-linux-gnu/bin
# Arch ships libxml2 with a newer soname; a local compat link keeps the
# portable Postgres self-hosted (no system-wide changes). Its own lib/ holds
# libpq.so.5 too — needed by dblink.so at CREATE EXTENSION time.
export LD_LIBRARY_PATH=~/.local/opt/pgextralibs:$HOME/.local/opt/postgresql-16.15.0-x86_64-unknown-linux-gnu/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
DATA=~/.local/opt/pgdata-prime
PORT=54329

init() {
  if [ ! -f "$DATA/PG_VERSION" ]; then
    "$PG/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null || exit 1
  fi
}

start() {
  # Idempotent: skip if the cluster is already running.
  if "$PG/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
    return 0
  fi
  "$PG/pg_ctl" -D "$DATA" -l "$DATA.log" \
    -o "-p $PORT -k /tmp -c listen_addresses='localhost'" start >/dev/null || exit 1
}

stop() {
  "$PG/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1
}

# bootstrap_loopback — dblink refuses connections that used no password for
# non-superusers (anti-escalation, by design), so the verdict-writer loopback
# connects through a dedicated password-auth role. The password is RANDOM PER
# RUN and lives only in this throwaway cluster's catalog + a connstr table:
# nothing credential-shaped lands in source or git. The pg_hba line is
# inserted above the blanket trust rules so only this role is challenged.
bootstrap_loopback() {
  PW=$(openssl rand -hex 24)
  if ! grep -q '^local   all             verify_writer' "$DATA/pg_hba.conf" 2>/dev/null; then
    sed -i "1ilocal   all             verify_writer                           scram-sha-256" "$DATA/pg_hba.conf"
    "$PG/pg_ctl" -D "$DATA" reload >/dev/null 2>&1 || true
  fi
  PS="$PG/psql -X -v ON_ERROR_STOP=1 -h localhost -p $PORT -U postgres -d postgres -q"
  $PS -c "drop table if exists public.verify_results;
          drop table if exists public.dblink_connstr;
          drop role if exists verify_writer;
          create role verify_writer login password '$PW';
          create table public.dblink_connstr (connstr text);
          insert into public.dblink_connstr values
            ('host=/tmp port=$PORT dbname=postgres user=verify_writer password=$PW sslmode=disable gssencmode=disable');"
}

apply_and_verify() {
  PS="$PG/psql -X -v ON_ERROR_STOP=1 -h localhost -p $PORT -U postgres -d postgres -q"
  echo "== bootstrap replica schema =="
  $PS -f 00_replica_schema.sql || return 1
  echo "== apply prime migration 01 (authz spine) =="
  $PS -f ../../supabase/migrations/prime/20260929_01_authz_spine.sql || return 1
  echo "== apply prime migration 02 (record engine) =="
  $PS -f ../../supabase/migrations/prime/20260929_02_record_engine.sql || return 1
  echo "== apply prime migration 03 (draft creation) =="
  $PS -f ../../supabase/migrations/prime/20260929_03_record_drafts.sql || return 1
  echo "== apply prime migration 04 (dashboard stats) =="
  $PS -f ../../supabase/migrations/prime/20260929_04_dashboard_stats.sql || return 1
  echo "== apply prime migration 05 (decision notifications) =="
  $PS -f ../../supabase/migrations/prime/20260929_05_decision_notifications.sql || return 1
  echo "== apply prime migration 06 (error reports hook) =="
  $PS -f ../../supabase/migrations/prime/20260929_06_error_reports_hook.sql || return 1
  echo "== apply supabase-default privilege layer (test replica) =="
  $PS -f 01b_replica_grants.sql || return 1
  echo "== run verification battery =="
  $PS -f verify.sql
}

case "${1:-all}" in
  init)  init ;;
  start) start ;;
  stop)  stop ;;
  all)
    init
    start
    bootstrap_loopback
    apply_and_verify
    ;;
  clean)
    stop
    rm -rf "$DATA"
    ;;
  *) echo "usage: $0 {init|start|stop|all|clean}" >&2; exit 2 ;;
esac