#!/bin/bash
# Put the CURRENT code on a Vercel preview, and point the local backend at
# it, in one command.
#
#   bash tools/local-stack/deploy-preview.sh
#
# What it does, in order:
#   1. builds the app against the LOCAL API (127.0.0.1:54352)
#   2. deploys it to Vercel as a preview
#   3. writes the new origin to ~/.local/qbase-local/preview-origin, which
#      is what the supervisor reads — so the proxy that serves the local
#      API to that origin is replaced automatically
#   4. waits for the deployment to be READY and prints the URL
#
# WHY A NEW URL EVERY TIME: a Vercel preview gets a fresh hostname, and
# Chrome's local-network-access permission is per-origin, so a new
# deployment means one more "Allow" click.  The URL stays the same for as
# long as the app does not change.
#
# The anon key is NOT passed on the command line.  The project already
# holds it, and the local stack uses the same one, so only the URL — which
# is not a secret — is overridden.
set -u
REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"
STATE="/home/kepv/.local/qbase-local"
API_PORT=54352
API_URL="http://127.0.0.1:$API_PORT"

cd "$REPO" || exit 1
mkdir -p "$STATE"

echo "── building against $API_URL"
VITE_SUPABASE_URL="$API_URL" npx vite build --outDir dist-preview >/tmp/qbase-local/build-preview.log 2>&1 || {
  echo "build failed — see /tmp/qbase-local/build-preview.log"; exit 1; }
echo "   built dist-preview"

echo "── deploying to Vercel"
OUT=$(npx vercel deploy --yes --prod=false \
  --build-env "VITE_SUPABASE_URL=$API_URL" 2>&1) || { echo "$OUT" | tail -20; exit 1; }
echo "$OUT" | tail -3

URL=$(echo "$OUT" | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)
if [ -z "$URL" ]; then
  echo "could not read the deployment URL from the CLI output"
  echo "$OUT" | tail -20
  exit 1
fi

ORIGIN=$(echo "$URL" | sed -E 's#^(https://[^/]+).*$#\1')
printf '%s\n' "$ORIGIN" > "$STATE/preview-origin"
echo "── origin: $ORIGIN"

echo "── waiting for the deployment to be ready"
for _ in $(seq 1 40); do
  STATE_NAME=$(npx vercel inspect "$URL" 2>/dev/null | grep -iE '^\s*state' | head -1 | awk '{print $2}')
  case "$STATE_NAME" in
    READY) echo "   ready"; break ;;
    ERROR|CRASHED) echo "   deployment $STATE_NAME"; exit 1 ;;
  esac
  sleep 3
done

echo
echo "preview : $URL"
echo "login   : /tmp/qbase-local/LOCAL_LOGIN.txt  (the LAST block)"
echo
echo "Open it in a browser ON THIS MACHINE and accept Chrome's one-time"
echo "\"local network access\" prompt for $ORIGIN."
