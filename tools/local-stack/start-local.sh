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

# 3. the static preview server for the local build
if ! ss -ltn 2>/dev/null | grep -q "127.0.0.1:5211"; then
  nohup node "$TOOLS/server.mjs" --port 5211 \
    --root "$REPO/dist-local" \
    --label "LOCAL STACK — local database (127.0.0.1:5433/qbase_local)" \
    --note "login: /tmp/qbase-local/LOCAL_LOGIN.txt" \
    > /tmp/qbase-local/server-local.log 2>&1 &
  sleep 1
fi

echo "preview : http://127.0.0.1:5211   (local database)"
echo "api     : http://127.0.0.1:54351  (proxy) -> 54350 (shim) -> 127.0.0.1:5433/qbase_local"
ss -ltn 2>/dev/null | grep -E "5211|54350|54351"
