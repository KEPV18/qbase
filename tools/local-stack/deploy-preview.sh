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
PRODUCTION_ALIAS="https://qbase-sable.vercel.app"

cd "$REPO" || exit 1
mkdir -p "$STATE"

echo "── building against $API_URL"
VITE_SUPABASE_URL="$API_URL" npx vite build --outDir dist-preview >/tmp/qbase-local/build-preview.log 2>&1 || {
  echo "build failed — see /tmp/qbase-local/build-preview.log"; exit 1; }
echo "   built dist-preview"

echo "── deploying to Vercel"
# NO --prod flag at all.
#
# `--prod=false` used to be the way to ask for a preview, and the CLI
# honoured it.  A newer CLI (65.2.0) does NOT: the flag is a boolean
# shorthand, so `--prod=false` reads as "prod, with the value 'false'",
# and the deployment lands on the PRODUCTION alias.  That is what
# happened on 2026-10-23 — a preview was asked for and the production
# alias was replaced instead.
#
# So: ask for a preview by not asking for production, and then CHECK
# what the deployment actually is.  The check is the important half; a
# flag is a request, the target is the fact.
#
# The check is the ALIAS ITSELF: its deployment id is read before the
# deploy and again after, and if it changed then the deploy reached
# production — whatever the CLI called it.  That is the one fact that
# matters here, and it cannot be argued with.
alias_deployment() {
  # The CLI writes its report to STDERR in this environment, so `2>&1` is
  # not a mistake here — it is the only way to read the report at all.
  npx vercel inspect "$PRODUCTION_ALIAS" 2>&1 | grep -oE 'dpl_[A-Za-z0-9]+' | head -1
}
BEFORE=$(alias_deployment)

OUT=$(npx vercel deploy --yes \
  --build-env "VITE_SUPABASE_URL=$API_URL" 2>&1) || { echo "$OUT" | tail -20; exit 1; }
echo "$OUT" | tail -3

URL=$(echo "$OUT" | grep -iE '^[[:space:]]*Preview' | grep -oE 'https://[^ ]+' | head -1)
if [ -z "$URL" ]; then
  # The CLI also prints a JSON block; its "url" is the deployment's own.
  URL=$(echo "$OUT" | grep -oE '"url"[[:space:]]*:[[:space:]]*"https://[^"]+"' | head -1 | grep -oE 'https://[^"]+')
fi
if [ -z "$URL" ]; then
  echo "could not read the deployment URL from the CLI output"
  echo "$OUT" | tail -20
  exit 1
fi

AFTER=$(alias_deployment)
if [ -n "$BEFORE" ] && [ "$BEFORE" != "$AFTER" ]; then
  echo
  echo "This deploy reached PRODUCTION: the alias moved from $BEFORE to $AFTER."
  echo "The production alias is $PRODUCTION_ALIAS, and only a deliberate"
  echo "production deploy (tools/local-stack/deploy-live.sh) may replace it."
  exit 1
fi

TARGET=$(npx vercel inspect "$URL" 2>&1 | grep -iE '^[[:space:]]*target' | head -1 | awk '{print $2}')
if [ "$TARGET" != "preview" ]; then
  echo
  echo "This deployment is a $TARGET, not a preview.  Nothing was pointed at it."
  echo "The production alias is $PRODUCTION_ALIAS and only a deliberate"
  echo "production deploy (tools/local-stack/deploy-live.sh) may replace it."
  exit 1
fi

HOST=${URL#https://}
HOST=${HOST%%/*}
ORIGIN="https://$HOST"
printf '%s\n' "$ORIGIN" > "$STATE/preview-origin"
echo "── origin: $ORIGIN  (target: $TARGET)"

echo "── waiting for the deployment to be ready"
for _ in $(seq 1 40); do
  STATE_NAME=$(npx vercel inspect "$URL" 2>&1 | grep -iE '^[[:space:]]*state' | head -1 | awk '{print $2}')
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
