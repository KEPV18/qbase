#!/usr/bin/env bash
#
# check-auth-redirect.sh
# ----------------------
# Recurrence guard for the "shared Supabase project pointed at the wrong app"
# misconfiguration.
#
# The QBase repo and the QMS Forge repo share ONE Supabase project
# (ref: iouuikteroixnsqazznc). Password-recovery links are redirected to
# whatever `site_url` says, and only URLs present in `uri_allow_list` are
# accepted as redirect targets. If `site_url` drifts to another application,
# every recovery link lands on the wrong origin -- silently.
#
# This script:
#   * reads a Supabase Management API token from the environment (never hard-codes it)
#   * issues a single GET against the project's auth config
#   * asserts that site_url == the expected QBase origin
#   * asserts that the expected QBase origin is present in uri_allow_list
#
# It is strictly READ-ONLY: no PATCH/PUT/POST/DELETE, no email is ever sent,
# no remote state is ever mutated.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/check-auth-redirect.sh
#   EXPECTED_SITE_URL="https://staging.example.com" ./scripts/check-auth-redirect.sh
#
# Exit codes:
#   0 -> PASS
#   1 -> FAIL (misconfiguration detected)
#   2 -> FAIL (environment / tooling problem, no assertion performed)

set -euo pipefail

PROJECT_REF="iouuikteroixnsqazznc"
EXPECTED_URL="${EXPECTED_SITE_URL:-https://qbase-sable.vercel.app}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "FAIL [env]: SUPABASE_ACCESS_TOKEN is not set."
  echo "            Export a Supabase Management API token before running this check."
  echo "            Example:  export SUPABASE_ACCESS_TOKEN=sbp_...   (do NOT commit it)"
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "FAIL [env]: curl is required but was not found on PATH."
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "FAIL [env]: python3 is required (used to parse the JSON response)."
  exit 2
fi

# Single read-only GET. The response is captured first (never piped straight
# into grep) so that `set -o pipefail` cannot turn a clean grep miss into a
# confusing failure, and so the payload can be parsed exactly once.
resp=$(curl -sS --fail-with-body \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth") || {
  echo "FAIL [api]: the Supabase Management API GET returned a non-2xx status."
  echo "            Check that SUPABASE_ACCESS_TOKEN is valid and has access to ${PROJECT_REF}."
  exit 2
}

site=$(printf '%s' "$resp" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("site_url",""))')
allow=$(printf '%s' "$resp" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("uri_allow_list",""))')

echo "--- Auth redirect smoke check ---"
echo "project_ref     : ${PROJECT_REF}"
echo "expected_url    : ${EXPECTED_URL}"
echo "actual site_url : ${site}"
echo "uri_allow_list  : ${allow}"

fail=0

# Assertion 1: site_url must be exactly the expected QBase origin.
if [[ "$site" == "$EXPECTED_URL" ]]; then
  echo "check site_url          : ok"
else
  echo "check site_url          : MISMATCH (recovery links land on the wrong origin)"
  fail=1
fi

# Assertion 2: the expected origin must be allowed as a redirect target.
case "$allow" in
  *"$EXPECTED_URL"*) echo "check uri_allow_list    : ok" ;;
  *)
    echo "check uri_allow_list    : MISSING ${EXPECTED_URL} (recovery links will be rejected)"
    fail=1
    ;;
esac

if [[ "$fail" -eq 0 ]]; then
  echo "PASS: auth redirect config is correct for ${EXPECTED_URL}"
  exit 0
fi

echo "FAIL: auth redirect config is NOT correct for ${EXPECTED_URL}"
exit 1
