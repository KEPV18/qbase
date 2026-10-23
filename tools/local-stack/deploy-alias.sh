#!/bin/bash
# Refresh the PRODUCTION ALIAS with the current code, against the LOCAL
# stack.
#
#   bash tools/local-stack/deploy-alias.sh
#
# WHY THIS EXISTS: while the live Supabase project is paused, the only
# backend that answers is the local one on this machine.  The alias
# `qbase-sable.vercel.app` is the address the owner actually types, so
# this keeps that address current — with the newest code — instead of
# leaving it on a build from three days ago that points at a host which
# no longer resolves.
#
# WHAT THIS MEANS: a build made this way talks to 127.0.0.1, so it
# works in a browser ON THIS MACHINE (Chrome asks once for the
# local-network-access permission) and nowhere else.  It is NOT a
# release: when the live project is restored, `deploy-live.sh` replaces
# this with a build against the live host, and the alias works from any
# device again.
#
# The script refuses to run once the live project answers — at that
# point the live deploy is the right one, and this would only undo it.
set -u
REPO="/home/kepv/qbase-remediation"
TOOLS="$REPO/tools/local-stack"
STATE="/home/kepv/.local/qbase-local"
API_PORT=54352
API_URL="http://127.0.0.1:$API_PORT"
ALIAS="https://qbase-sable.vercel.app"

cd "$REPO" || exit 1

if bash "$TOOLS/check-live.sh" >/dev/null 2>&1; then
  echo "The live project is answering again."
  echo "Use tools/local-stack/deploy-live.sh — a build against the local"
  echo "stack would replace it with one that only works on this machine."
  exit 1
fi

echo "── building against $API_URL"
VITE_SUPABASE_URL="$API_URL" npx vite build --outDir dist-preview >/tmp/qbase-local/build-alias.log 2>&1 || {
  echo "build failed — see /tmp/qbase-local/build-alias.log"; exit 1; }
echo "   built dist-preview"

echo "── deploying to the alias"
OUT=$(npx vercel deploy --prod --yes \
  --build-env "VITE_SUPABASE_URL=$API_URL" 2>&1) || { echo "$OUT" | tail -20; exit 1; }
echo "$OUT" | tail -3

echo
echo "── checking the alias"
sleep 5
echo "   site HTTP $(curl -s -o /dev/null -w '%{http_code}' "$ALIAS/")"
TARGET=$(npx vercel inspect "$ALIAS" 2>&1 | grep -iE '^[[:space:]]*target' | head -1 | awk '{print $2}')
echo "   target     : ${TARGET:-unknown}"
echo "   the build points at the LOCAL stack — it works in a browser on"
echo "   this machine only, and asks once for Chrome's local-network"
echo "   access permission."
