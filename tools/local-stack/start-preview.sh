#!/bin/bash
# Bring up the local stack so a VERCEL PREVIEW can reach it.
#
#   preview : https://<your-preview>.vercel.app
#   proxy   : 127.0.0.1:54356  (CORS + the private-network opt-in, for ONE origin)
#   shim    : 127.0.0.1:54350  (PostgREST-compatible API)
#   database: 127.0.0.1:5433/qbase_local (Postgres 16.8 on this machine)
#
# A preview is served over HTTPS, so its page asking for http://127.0.0.1 is
# a PRIVATE NETWORK REQUEST and Chrome blocks it twice: the server has to opt
# in with `Access-Control-Allow-Private-Network: true` (the proxy does that),
# and the browser has to be given a SITE PERMISSION for the origin (the user
# does that, in the one-time prompt Chrome shows).
#
# The opt-in is a door, and it is opened to ONE origin: any other origin is
# refused with 403 before it reaches the database.  Pass the preview's exact
# origin — a `*` inside one entry matches anything, and is not needed here.
#
#   bash tools/local-stack/start-preview.sh https://abc123-kepv18s-projects.vercel.app
#
# The preview itself is already deployed; this only makes the BACKEND behind
# it answer.  The stack dies with the session, so run this again afterwards.
set -u
REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"
STATE="/home/kepv/.local/qbase-local"
mkdir -p /tmp/qbase-local "$STATE"

# The port the preview talks to — it is baked into the preview's build.
PREVIEW_PORT="${PREVIEW_PORT:-54356}"

ORIGIN="${1:-}"
if [ -z "$ORIGIN" ]; then
  echo "usage: bash tools/local-stack/start-preview.sh <preview-origin>" >&2
  echo "  e.g. https://qbase-48z8azwdf-kepv18s-projects.vercel.app" >&2
  exit 2
fi
case "$ORIGIN" in
  https://*) ;;
  *) echo "the origin must be https:// — a preview is served over https" >&2; exit 2 ;;
esac

# 1. the whole local stack (shim, the SPA's proxy, the SPA)
bash "$TOOLS/start-local.sh" > /tmp/qbase-local/start-local.out 2>&1

# 2. the proxy the PREVIEW talks to.  It is a second one, on its own port,
#    so the origin-scoped allow-list never touches the SPA's proxy.
#    The origin is also written to the state file, so the supervisor
#    (supervise-local.sh) knows which origin it is allowed to serve.
#
#    The allow-list the proxy enforces lives in a FILE that the proxy
#    re-reads, so pointing the stack at a new preview no longer means
#    stopping and starting the proxy: write the file, and the next
#    request from the new origin is allowed.
printf '%s\n' "$ORIGIN" > "$STATE/preview-origin"
PRODUCTION_ALIAS="${PRODUCTION_ALIAS:-https://qbase-sable.vercel.app}"
if [ "$ORIGIN" = "$PRODUCTION_ALIAS" ]; then
  ALLOW="$ORIGIN"
else
  ALLOW="$ORIGIN,$PRODUCTION_ALIAS"
fi
printf '%s\n' "$ALLOW" > "$STATE/preview-allow-list"
if ! ss -ltn 2>/dev/null | grep -q "127.0.0.1:$PREVIEW_PORT"; then
  ALLOWED_ORIGIN_FILE="$STATE/preview-allow-list" nohup python3 "$TOOLS/cors-proxy.py" \
    --listen "$PREVIEW_PORT" --upstream 127.0.0.1:54350 \
    > /tmp/qbase-local/proxy-preview.log 2>&1 &
  echo $! > "$STATE/proxy-preview.pid"
  sleep 1
fi

echo
echo "preview : $ORIGIN"
echo "api     : http://127.0.0.1:$PREVIEW_PORT (proxy, origin-scoped) -> 54350 (shim) -> 127.0.0.1:5433/qbase_local"
echo "login   : /tmp/qbase-local/LOCAL_LOGIN.txt  (read the LAST block; the password is never printed)"
echo
echo "Open the preview in a browser ON THIS MACHINE and accept Chrome's one-time"
echo "\"local network access\" prompt for $ORIGIN — without it the browser blocks"
echo "the request before it is sent, and the page stays empty."
ss -ltn 2>/dev/null | grep -E "54350|54351|$PREVIEW_PORT"
