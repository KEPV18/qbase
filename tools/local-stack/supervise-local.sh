#!/bin/bash
# Keep the local Supabase-like stack UP.
#
#   127.0.0.1:5433   Postgres (qbase_local)
#   127.0.0.1:54350  the API shim (qbase_api.py)
#   127.0.0.1:54351  the CORS proxy for the local SPA
#   127.0.0.1:54352  the CORS proxy for the VERCEL PREVIEW (one origin only)
#   127.0.0.1:5210   the local SPA (also on 5211)
#
# WHY THIS EXISTS: a Vercel preview is served over HTTPS and has to reach
# the API on 127.0.0.1, so the preview is only as alive as this stack is.
# The stack used to die with the shell session, which made "test it from
# Vercel" a one-shot thing.  This keeps it running — under systemd, with
# linger on, so it survives a logout and a reboot.
#
# THE ONE RULE: it never stops anything.  Every check is "is this port
# answering?  if not, start it".  A piece that is already up is left
# exactly as it is — including a piece somebody else started by hand.
# The single exception is the preview proxy (54352), which this script
# owns: when the allowed ORIGIN changes, that proxy has to be replaced,
# because the origin is read once, at start.
#
# The origin lives in $STATE/preview-origin, so a new deployment can be
# pointed at simply by writing the new origin there.
set -u

REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"
STATE="/home/kepv/.local/qbase-local"
LOGS="/tmp/qbase-local"
PG_BIN="/home/kepv/.local/pgsql-dl/pg/bin/postgres"
PGDATA="$STATE/pgdata"
SHIM_PY="/home/kepv/.local/share/pipx/venvs/qwenpaw/bin/python3"
ORIGIN_FILE="$STATE/preview-origin"
APPLIED_FILE="$STATE/preview-origin.applied"
PREVIEW_PID_FILE="$STATE/proxy-preview.pid"
# The production alias of this project — the address the owner types.
PRODUCTION_ORIGIN="${PRODUCTION_ORIGIN:-https://qbase-sable.vercel.app}"

# The database the local shim talks to.  It is set HERE, in the environment
# of this script, so that a shim this script starts can never inherit the
# LIVE project from another instance: run-shim.py keeps an SB_DSN that is
# already set, and the local stack is the one place that sets it.
export SB_DSN="postgresql://postgres@127.0.0.1:5433/qbase_local"

mkdir -p "$LOGS" "$STATE"
umask 077

port_up() { ss -ltn 2>/dev/null | grep -q "127.0.0.1:$1"; }

say() { echo "$(date '+%H:%M:%S') $*"; }

# ── Postgres ───────────────────────────────────────────────────────────────
# Started the way it was started by hand: the same binary, the same data
# directory, the same port, the socket in /tmp.
start_postgres() {
  port_up 5433 && return 0
  [ -x "$PG_BIN" ] && [ -d "$PGDATA" ] || { say "postgres: no binary or no data dir"; return 1; }
  say "postgres: starting"
  nohup "$PG_BIN" -D "$PGDATA" -p 5433 -k /tmp >> "$LOGS/postgres.log" 2>&1 &
  for _ in $(seq 1 30); do port_up 5433 && { say "postgres: up"; return 0; }; sleep 1; done
  say "postgres: did not come up — see $LOGS/postgres.log"
  return 1
}

# ── the API shim ───────────────────────────────────────────────────────────
# The shim's credentials are inherited from a running instance's environ
# (run-shim.py), so no secret is ever written to disk — not by this script
# and not by the tool it calls.  The cost of that choice is honest and
# worth stating: if the shim is the only instance running and it dies,
# there is nothing left to inherit from, and the shim has to be started by
# hand (tools/local-stack/start-local.sh).  The alternative — a snapshot of
# the environment on disk — would put a service key and a JWT secret in a
# file, and that is a worse trade than one manual command.
shim_source_pid() {
  # Prefer an instance that already points at the LOCAL database: the
  # credentials are the same either way, but a source on the live DSN
  # would hand a live SB_DSN to the new shim.
  local fallback=""
  for p in /proc/[0-9]*; do
    local pid=${p#/proc/}
    [ -r "$p/cmdline" ] || continue
    tr '\0' ' ' < "$p/cmdline" 2>/dev/null | grep -q 'qbase_api.py' || continue
    [ -r "$p/environ" ] || continue
    tr '\0' '\n' < "$p/environ" 2>/dev/null | grep -q '^SB_REF=' || continue
    if tr '\0' '\n' < "$p/environ" 2>/dev/null | grep -q '^SB_DSN=.*5433'; then
      echo "$pid"; return 0
    fi
    [ -n "$fallback" ] || fallback="$pid"
  done
  [ -n "$fallback" ] && { echo "$fallback"; return 0; }
  return 1
}

start_shim() {
  port_up 54350 && return 0
  say "shim: starting"
  local src
  if src=$(shim_source_pid); then
    # A live instance to inherit from — nothing is written to disk.
    nohup python3 "$TOOLS/run-shim.py" "$TOOLS/qbase_api.py" --port 54350 \
      >> "$LOGS/shim-local.log" 2>&1 &
  else
    say "shim: no live instance to inherit from — start it by hand:"
    say "         bash $TOOLS/start-local.sh"
    return 1
  fi
  for _ in $(seq 1 30); do port_up 54350 && { say "shim: up"; return 0; }; sleep 1; done
  say "shim: did not come up — see $LOGS/shim-local.log"
  return 1
}

# ── the CORS proxies ───────────────────────────────────────────────────────
start_proxy() {
  local port=$1
  port_up "$port" && return 0
  say "proxy $port: starting"
  nohup python3 "$TOOLS/cors-proxy.py" --listen "$port" --upstream 127.0.0.1:54350 \
    >> "$LOGS/proxy-$port.log" 2>&1 &
  echo $! > "$STATE/proxy-$port.pid"
  for _ in $(seq 1 20); do port_up "$port" && { say "proxy $port: up"; return 0; }; sleep 1; done
  say "proxy $port: did not come up — see $LOGS/proxy-$port.log"
  return 1
}

# The preview proxy is the one this script OWNS: the allowed origin is read
# once, at start, so a new deployment means a new proxy.  Only the pid this
# script started is ever stopped, and only after checking that it is still
# the preview proxy.
#
# TWO origins are allowed, not one: the newest deployment's own hostname,
# and the production alias.  The alias is the address the owner actually
# types, and a deployment that lands on it (the CLI's `--prod=false` is not
# honoured by every version) has to be able to reach the local API too.
# Both are named hosts of this one project — the list is not a wildcard
# over all of vercel.app, because the point of the list is to keep the
# local database out of reach of every other site on the internet.
start_preview_proxy() {
  local origin=""
  [ -s "$ORIGIN_FILE" ] && origin=$(head -1 "$ORIGIN_FILE" | tr -d '[:space:]')
  if [ -z "$origin" ]; then
    port_up 54352 || say "preview proxy: no origin in $ORIGIN_FILE — not starting it"
    return 0
  fi

  local allow="$origin"
  if [ "$origin" != "$PRODUCTION_ORIGIN" ]; then
    allow="$origin,$PRODUCTION_ORIGIN"
  fi

  local applied=""
  [ -s "$APPLIED_FILE" ] && applied=$(head -1 "$APPLIED_FILE" | tr -d '[:space:]')
  if port_up 54352 && [ "$applied" = "$allow" ]; then
    return 0
  fi

  if port_up 54352; then
    # The origin changed (or the pid was lost): replace OUR proxy only.
    local pid=""
    [ -s "$PREVIEW_PID_FILE" ] && pid=$(head -1 "$PREVIEW_PID_FILE" | tr -d '[:space:]')
    if [ -n "$pid" ] && [ -r "/proc/$pid/cmdline" ] \
       && tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q -- '--listen 54352'; then
      say "preview proxy: the allowed origin changed — replacing it"
      kill "$pid" 2>/dev/null
      for _ in $(seq 1 10); do port_up 54352 || break; sleep 1; done
    else
      say "preview proxy: 54352 is held by a process this script did not start — leaving it alone"
      return 0
    fi
  fi

  say "preview proxy: starting for $allow"
  ALLOWED_ORIGIN="$allow" nohup python3 "$TOOLS/cors-proxy.py" \
    --listen 54352 --upstream 127.0.0.1:54350 \
    >> "$LOGS/proxy-preview.log" 2>&1 &
  echo $! > "$PREVIEW_PID_FILE"
  printf '%s\n' "$allow" > "$APPLIED_FILE"
  for _ in $(seq 1 20); do port_up 54352 && { say "preview proxy: up"; return 0; }; sleep 1; done
  say "preview proxy: did not come up — see $LOGS/proxy-preview.log"
  return 1
}

# ── the local SPA ──────────────────────────────────────────────────────────
start_spa() {
  local port=$1
  port_up "$port" && return 0
  [ -d "$REPO/dist-local" ] || return 0
  say "spa $port: starting"
  nohup node "$TOOLS/server.mjs" --port "$port" --root "$REPO/dist-local" \
    --label "LOCAL STACK — the local database on this machine" \
    --note "login: /tmp/qbase-local/LOCAL_LOGIN.txt" \
    >> "$LOGS/server-local-$port.log" 2>&1 &
  sleep 1
}

while true; do
  start_postgres
  start_shim
  start_proxy 54351
  start_preview_proxy
  start_spa 5210
  start_spa 5211
  sleep 5
done
