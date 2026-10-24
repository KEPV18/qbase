#!/bin/bash
# Compare the SCHEMA of two local databases.
#
#   usage: bash tools/local-stack/compare-rebuild.sh [db_a] [db_b]
#   default: qbase_local  vs  qbase_rebuild_test
#
# Both databases are read through tools/local-stack/fingerprint.sql, which
# prints the tables, the columns, the constraints, the indexes, the
# triggers, the RLS policies, the table grants and the functions with
# their bodies and their ACLs — in a canonical order.
#
# The exit code is 0 when the two are the same and 1 when they differ, so
# the check can be used in a script.
#
# It reads the catalogue only: no row of user data is read and nothing is
# changed in either database.
set -eu

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS="$REPO/tools/local-stack"
WORK="${QBASE_LOCAL_WORK:-/tmp/qbase-local/fingerprint}"

PGHOST="${QBASE_PGHOST:-127.0.0.1}"
PGPORT="${QBASE_PGPORT:-5433}"
PGUSER="${QBASE_PGUSER:-postgres}"

A="${1:-qbase_local}"
B="${2:-qbase_rebuild_test}"

mkdir -p "$WORK"

PSQL="psql -h $PGHOST -p $PGPORT -U $PGUSER -tA -F ' | '"

for db in "$A" "$B"; do
  if ! $PSQL -d "$db" -f "$TOOLS/fingerprint.sql" > "$WORK/$db.txt" 2> "$WORK/$db.err"; then
    echo "ERROR: the fingerprint of '$db' failed:" >&2
    tail -5 "$WORK/$db.err" >&2
    exit 2
  fi
  echo "  $db: $(wc -l < "$WORK/$db.txt") lines"
done

if diff -u "$WORK/$A.txt" "$WORK/$B.txt" > "$WORK/diff.txt"; then
  echo "IDENTICAL — '$A' and '$B' have the same structure."
  exit 0
fi

echo "DIFFERENT — '$A' and '$B' are not the same.  The differences:"
cat "$WORK/diff.txt"
exit 1
