#!/bin/bash
# Bring up the LOCAL Supabase-like stack.
#
#   preview : http://127.0.0.1:5211   (SPA built from /home/kepv/qbase-remediation/dist-local)
#   proxy   : 127.0.0.1:54351          (CORS headers, incl. on error responses)
#   shim    : 127.0.0.1:54350          (PostgREST-compatible API)
#   database: 127.0.0.1:5433/qbase_local (Postgres 16.8 on this machine)
#
# The existing production-backed stack (5210 / 54341 / 54340) keeps running
# untouched; this one is entirely separate.
#
# The shim's credentials (JWT secret, anon/service keys) are inherited from a
# running shim instance's /proc/<pid>/environ by run-shim.py, so no secret is
# ever written to disk, to argv, or to a transcript.
set -u
REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"
mkdir -p /tmp/qbase-local

export SB_DSN="postgresql://postgres@127.0.0.1:5433/qbase_local"

# 1. the API shim against the LOCAL database
if ! ss -ltn 2>/dev/null | grep -q "127.0.0.1:54350"; then
  nohup python3 "$TOOLS/run-shim.py" "$TOOLS/qbase_api.py" --port 54350 \
    > /tmp/qbase-local/shim-local.log 2>&1 &
  sleep 2
fi

# 2. the CORS proxy
if ! ss -ltn 2>/dev/null | grep -q "127.0.0.1:54351"; then
  nohup python3 "$TOOLS/cors-proxy.py" --listen 54351 --upstream 127.0.0.1:54350 \
    > /tmp/qbase-local/proxy-local.log 2>&1 &
  sleep 1
fi

# 3. the static preview server for the local build.
#    It answers on BOTH 5210 and 5211: 5210 is the port the owner habitually
#    opens, and it must never point at the live project by accident — a
#    local password against the live stack answers 400 invalid_grant, which
#    looks exactly like a broken login.
for p in 5210 5211; do
  if ! ss -ltn 2>/dev/null | grep -q "127.0.0.1:$p"; then
    nohup node "$TOOLS/server.mjs" --port "$p" \
      --root "$REPO/dist-local" \
      --label "LOCAL STACK — the local database on this machine" \
      --note "login: /tmp/qbase-local/LOCAL_LOGIN.txt" \
      > "/tmp/qbase-local/server-local-$p.log" 2>&1 &
    sleep 1
  fi
done

echo "preview : http://127.0.0.1:5210   (local database)  <- open this one"
echo "         http://127.0.0.1:5211   (the same local build)"
echo "api     : http://127.0.0.1:54351  (proxy) -> 54350 (shim) -> 127.0.0.1:5433/qbase_local"
echo "live    : http://127.0.0.1:5212   (the real project — production password)"
ss -ltn 2>/dev/null | grep -E "5210|5211|5212|54350|54351"
