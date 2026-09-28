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
#   * asserts that the sibling QMS Forge origin is still present in uri_allow_list
#
# Allow-list matching is EXACT-ORIGIN, never substring. Each comma-separated
# entry has any path (`/**`, `/reset-password`, ...) stripped before comparison,
# so `https://qbase-sable.vercel.app.evil.com/**` can never satisfy the check
# for `https://qbase-sable.vercel.app`.
#
# It is strictly READ-ONLY: no PATCH/PUT/POST/DELETE, no email is ever sent,
# no remote state is ever mutated.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/check-auth-redirect.sh
#   EXPECTED_SITE_URL="https://staging.example.com" ./scripts/check-auth-redirect.sh
#
# Exit codes:
#   0 -> PASS (every assertion held)
#   1 -> FAIL (misconfiguration detected: origin mismatch or missing allow-list entry)
#   2 -> FAIL (environment / tooling problem; no assertion could be evaluated.
#              Covers: missing token, missing curl/python3, non-2xx API response,
#              unparseable (non-JSON) response body)

set -euo pipefail

PROJECT_REF="iouuikteroixnsqazznc"
EXPECTED_URL="${EXPECTED_SITE_URL:-https://qbase-sable.vercel.app}"
EXPECTED_FORGE_URL="${EXPECTED_FORGE_URL:-https://qms-forge.vercel.app}"

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

# Parse once. Exit code 3 means "not usable JSON / not a JSON object"; that is a
# tooling problem (exit 2), and the raw traceback is deliberately suppressed.
parsed=$(printf '%s' "$resp" | python3 -c '
import sys, json

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(3)

if not isinstance(data, dict):
    sys.exit(3)

def norm(value):
    # null / missing / non-string all collapse to an empty string.
    return value if isinstance(value, str) else ""

print(norm(data.get("site_url")))
print(norm(data.get("uri_allow_list")))
') || {
  echo "FAIL [parse]: the API response body was not valid JSON (no assertion performed)."
  echo "               Expected a JSON object with site_url / uri_allow_list keys."
  exit 2
}

site=$(printf '%s\n' "$parsed" | sed -n '1p')
allow=$(printf '%s\n' "$parsed" | sed -n '2p')

# Reduce a comma-separated allow-list to one bare origin per line.
# Strips surrounding whitespace and any path component.
origins=$(
  # `|| [[ -n ... ]]` matters: the final entry has no trailing newline, and a
  # bare `read` returns non-zero at EOF, which would silently drop it.
  printf '%s' "$allow" | tr ',' '\n' | while IFS= read -r entry || [[ -n "$entry" ]]; do
    entry="${entry#"${entry%%[![:space:]]*}"}"
    entry="${entry%"${entry##*[![:space:]]}"}"
    if [[ -z "$entry" ]]; then
      continue
    fi
    if [[ "$entry" == *"://"* ]]; then
      rest="${entry#*://}"
      printf '%s\n' "${entry%%://*}://${rest%%/*}"
    else
      printf '%s\n' "$entry"
    fi
  done
)

has_origin() {
  local want="$1" candidate
  while IFS= read -r candidate; do
    if [[ "$candidate" == "$want" ]]; then
      return 0
    fi
  done <<< "$origins"
  return 1
}

echo "--- Auth redirect smoke check ---"
echo "project_ref     : ${PROJECT_REF}"
echo "expected_url    : ${EXPECTED_URL}"
echo "actual site_url : ${site:-(none)}"
echo "uri_allow_list  : ${allow:-(none)}"

fail=0

# Assertion 1: site_url must be exactly the expected QBase origin.
if [[ "$site" == "$EXPECTED_URL" ]]; then
  echo "check site_url          : ok"
else
  echo "check site_url          : MISMATCH (recovery links land on the wrong origin)"
  fail=1
fi

# Assertion 2: the expected origin must be allowed as a redirect target.
# Exact origin comparison -- a longer host that merely contains EXPECTED_URL as
# a prefix (e.g. EXPECTED_URL.evil.com) must NOT satisfy this.
if has_origin "$EXPECTED_URL"; then
  echo "check uri_allow_list    : ok"
else
  echo "check uri_allow_list    : MISSING ${EXPECTED_URL} (recovery links will be rejected)"
  fail=1
fi

# Assertion 3: the shared project also serves QMS Forge; dropping its origin
# would silently break QMS Forge sign-in / recovery.
if has_origin "$EXPECTED_FORGE_URL"; then
  echo "check qms-forge allow-list : ok"
else
  echo "check qms-forge allow-list : MISSING ${EXPECTED_FORGE_URL} (QMS Forge sign-in will break)"
  fail=1
fi

if [[ "$fail" -eq 0 ]]; then
  echo "PASS: auth redirect config is correct for ${EXPECTED_URL}"
  exit 0
fi

echo "FAIL: auth redirect config is NOT correct for ${EXPECTED_URL}"
exit 1
