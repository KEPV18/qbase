#!/bin/bash
# Is the LIVE Supabase project answering?
#
#   bash tools/local-stack/check-live.sh
#
# Read-only: it resolves a hostname and makes two GETs.  It sends no
# password and no credential of any kind — the anon key is public by
# design, and it is the same key the app already ships in its bundle.
#
# It answers the three questions that matter before anything is deployed:
#
#   1. DNS      — a paused project stops resolving; a deleted one never
#                 resolved.  These are different problems with different
#                 fixes, and the console error tells them apart
#                 (ERR_NAME_NOT_RESOLVED vs 503).
#   2. REST     — the org can be over its egress quota, and then every
#                 request answers 402 even though the project is healthy.
#   3. AUTH     — /auth/v1/health is the endpoint the login uses; if it
#                 answers, the sign-in path is alive.
#
# The exit code is 0 only when all three are good.
set -u
REPO="/home/kepv/qbase-remediation"
LIVE_URL="${LIVE_URL:-https://iouuikteroixnsqazznc.supabase.co}"
KEY=$(grep '^VITE_SUPABASE_ANON_KEY=' "$REPO/.env.local" 2>/dev/null | cut -d= -f2-)

host=$(echo "$LIVE_URL" | sed -E 's#https?://([^/]+).*#\1#')
ok=1

echo "live project : $LIVE_URL"
echo

echo -n "1. DNS       : "
if getent hosts "$host" >/dev/null 2>&1; then
  echo "resolves"
else
  echo "DOES NOT RESOLVE"
  echo "               -> the project's API hostname is gone.  That is what a"
  echo "                  PAUSED project looks like (the database stays up, the"
  echo "                  API hostname stops resolving).  Restore it from the"
  echo "                  Supabase dashboard:  Project Settings -> Restore project."
  ok=0
fi

echo -n "2. REST      : "
if [ -z "$KEY" ]; then
  echo "no anon key in .env.local — cannot check"
  ok=0
else
  code=$(curl -s -o /tmp/qbase-local/live-rest.json -w '%{http_code}' --max-time 20 \
    "$LIVE_URL/rest/v1/tenant_settings?select=id&limit=1" -H "apikey: $KEY" 2>/dev/null)
  case "$code" in
    200) echo "200 — the API is answering" ;;
    402) echo "402 — the organisation is over its egress quota"
         echo "               -> the project can be alive and still refuse every"
         echo "                  request.  This one needs a billing/quota action."
         ok=0 ;;
    401|403) echo "$code — the anon key is refused" ;;
    000) echo "no answer (timeout or DNS)" ; ok=0 ;;
    *) echo "$code — $(head -c 120 /tmp/qbase-local/live-rest.json 2>/dev/null)" ; ok=0 ;;
  esac
fi

echo -n "3. AUTH      : "
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  "$LIVE_URL/auth/v1/health" -H "apikey: $KEY" 2>/dev/null)
case "$code" in
  200) echo "200 — the sign-in path is alive" ;;
  000) echo "no answer (timeout or DNS)"; ok=0 ;;
  *) echo "$code" ; ok=0 ;;
esac

echo
echo -n "database host: "
getent hosts "db.hkkdbxvmvvcxpgfqlrnp.supabase.co" >/dev/null 2>&1 \
  && echo "resolves — the database is still there" \
  || echo "DOES NOT RESOLVE"

echo
if [ "$ok" = "1" ]; then
  echo "READY — a build against the live project will work."
else
  echo "NOT READY — deploying now would produce another dead build."
fi
exit $((1 - ok))
