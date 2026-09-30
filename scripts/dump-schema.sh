#!/usr/bin/env bash
# Writes supabase/schema.sql: the live database's public schema (tables,
# functions, policies and grants), no data. Reads SUPABASE_DB_URL from .env.
# Needs Docker; run with sudo when the user is not in the docker group.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$APP_DIR/supabase/schema.sql"
START=$(date +%s)
if [ -t 1 ]; then OK=$'\e[32m[OK]\e[0m'; FAIL=$'\e[31m[FAIL]\e[0m'; else OK='[OK]'; FAIL='[FAIL]'; fi

echo "[1/3] starting: read the database address"
DB_URL=$(grep -E '^SUPABASE_DB_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2- | sed -E 's/^["'"'"']//; s/["'"'"']$//' || true)
if [ -z "$DB_URL" ]; then echo "[1/3] $FAIL SUPABASE_DB_URL is not set in $APP_DIR/.env"; exit 1; fi
echo "[1/3] $OK address found"

echo "[2/3] starting: dump the public schema (downloads the postgres:17 image on first run)"
ticker() { local s=$(date +%s); while :; do printf '\r  %ss' $(( $(date +%s) - s )) >&2; sleep 1; done; }
ticker & TICK=$!
trap 'kill $TICK 2>/dev/null || true' EXIT
TMP=$(mktemp)
if docker run --rm --network host postgres:17 pg_dump "$DB_URL" \
    --schema-only --schema=public --no-owner > "$TMP" 2> "$TMP.err"; then
  kill $TICK 2>/dev/null || true; printf '\r' >&2
  echo "[2/3] $OK dump complete"
else
  kill $TICK 2>/dev/null || true; printf '\r' >&2
  echo "[2/3] $FAIL pg_dump failed:"; sed -E 's#postgres(ql)?://[^ ]*#<address hidden>#g' "$TMP.err"; rm -f "$TMP" "$TMP.err"; exit 1
fi

echo "[3/3] starting: write $OUT"
# Strip lines that a fresh Supabase project (or the SQL editor) can't or
# shouldn't run: pg_dump's own restrict/unrestrict markers, CREATE SCHEMA
# public and its comment (the schema already exists on every Supabase
# project), default-privilege grants for the supabase_admin role (that
# role doesn't exist outside Supabase's own managed instances), and
# transaction_timeout (only valid on Postgres 17+, dropped so the dump
# also applies to older Postgres targets).
sed -E '/^\\(restrict|unrestrict) /d; /^CREATE SCHEMA public;$/d; /^COMMENT ON SCHEMA public IS .*;$/d; /^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin /d; /^SET transaction_timeout = 0;$/d' "$TMP" > "$TMP.clean"
{ echo "-- Public schema of the live BayStats database, dumped $(date -u +%F) with pg_dump --schema-only."; echo "-- No data. Apply to a new Supabase project to stand up the tables, functions, policies and grants."; cat "$TMP.clean"; } > "$OUT"
# Supabase's default privileges grant EXECUTE on new functions to anon and
# authenticated at creation time, so a plain "REVOKE ALL ... FROM PUBLIC"
# on a SECURITY DEFINER function leaves those two roles able to call it.
# Append explicit revokes for every SECURITY DEFINER function in the dump.
# New SECURITY DEFINER functions must be added here by hand.
cat >> "$OUT" <<'SQL'

-- Explicit revokes for SECURITY DEFINER functions. Supabase's default
-- privileges grant EXECUTE on new functions to anon and authenticated at
-- creation time; REVOKE ... FROM PUBLIC above does not touch those
-- role-specific grants, so anon/authenticated must be revoked by name.
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
SQL
rm -f "$TMP" "$TMP.err" "$TMP.clean"
chown "$(stat -c %U "$APP_DIR")":"$(stat -c %G "$APP_DIR")" "$OUT"
echo "[3/3] $OK $(wc -l < "$OUT") lines written"
echo "Total elapsed: $(( $(date +%s) - START ))s"
