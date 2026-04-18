#!/usr/bin/env bash
# migrate-supabase-to-railway.sh
#
# Exports the public schema from Supabase and imports it into Railway Postgres.
#
# Usage:
#   export OLD_SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
#   export NEW_RAILWAY_DB_URL="postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway"
#   chmod +x scripts/migrate-supabase-to-railway.sh
#   ./scripts/migrate-supabase-to-railway.sh
#
# Requirements: pg_dump and psql must be installed (comes with postgresql-client).
#   macOS:  brew install libpq && brew link --force libpq
#   Ubuntu: sudo apt-get install -y postgresql-client

set -euo pipefail

DUMP_FILE="dump_$(date +%Y%m%d_%H%M%S).sql"

# ─── Preflight checks ────────────────────────────────────────────────────────

if [[ -z "${OLD_SUPABASE_DB_URL:-}" ]]; then
  echo "❌  OLD_SUPABASE_DB_URL is not set."
  echo "    Example:"
  echo "    export OLD_SUPABASE_DB_URL=\"postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres\""
  exit 1
fi

if [[ -z "${NEW_RAILWAY_DB_URL:-}" ]]; then
  echo "❌  NEW_RAILWAY_DB_URL is not set."
  echo "    Example:"
  echo "    export NEW_RAILWAY_DB_URL=\"postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway\""
  exit 1
fi

command -v pg_dump >/dev/null 2>&1 || {
  echo "❌  pg_dump not found. Install postgresql-client first."
  echo "    macOS:  brew install libpq && brew link --force libpq"
  echo "    Ubuntu: sudo apt-get install -y postgresql-client"
  exit 1
}

command -v psql >/dev/null 2>&1 || {
  echo "❌  psql not found. Install postgresql-client first."
  exit 1
}

# ─── Export from Supabase ─────────────────────────────────────────────────────

echo ""
echo "📤  Exporting public schema from Supabase..."
echo "    (Supabase requires SSL — enforcing PGSSLMODE=require)"
echo ""

# --schema=public          — only export our application data, not auth/storage/extensions
# --clean --if-exists      — add DROP statements so re-running is idempotent
# --no-owner --no-acl      — strip Supabase-specific roles; Railway has different roles
# --quote-all-identifiers  — avoids conflicts with reserved keywords
PGSSLMODE=require pg_dump \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --quote-all-identifiers \
  -d "$OLD_SUPABASE_DB_URL" \
  -f "$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
echo "✅  Dump complete: $DUMP_FILE ($DUMP_SIZE)"

# ─── Patch: add email + password_hash columns to profiles if missing ──────────

echo ""
echo "🔧  Patching dump: ensuring email and password_hash columns exist in profiles..."

# Append the ALTER TABLE statements at the end of the dump so they run after
# the table is created. Using IF NOT EXISTS so re-runs are safe.
cat >> "$DUMP_FILE" <<'SQL'

-- InvoiceFlow custom auth: ensure profiles table has the columns required by
-- the custom Node.js auth server (auth/signin, auth/signup routes).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email          TEXT,
  ADD COLUMN IF NOT EXISTS password_hash  TEXT;

-- Unique index on email so sign-in lookups are fast and duplicates are rejected.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (email);
SQL

echo "✅  Patch applied."

# ─── Import into Railway ──────────────────────────────────────────────────────

echo ""
echo "📥  Importing into Railway Postgres..."
echo ""

psql -d "$NEW_RAILWAY_DB_URL" -f "$DUMP_FILE"

echo ""
echo "✅  Import complete!"

# ─── Verify row counts ────────────────────────────────────────────────────────

echo ""
echo "🔍  Verifying row counts on Railway..."
echo ""

psql -d "$NEW_RAILWAY_DB_URL" --no-align --tuples-only -c "
SELECT
  table_name,
  (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', table_name), false, true, '')))[1]::text::int AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE'
ORDER BY table_name;
" | column -t -s '|'

# ─── Cleanup ─────────────────────────────────────────────────────────────────

echo ""
echo "🧹  Cleaning up dump file..."
rm -f "$DUMP_FILE"

echo ""
echo "🎉  Migration complete! Your Railway Postgres database is ready."
echo ""
echo "Next steps:"
echo "  1. Set VITE_PGRST_URL=<your Railway PostgREST domain> in Vercel"
echo "  2. Set VITE_API_BASE=<your Railway auth-api domain>  in Vercel"
echo "  3. Set DATABASE_URL and JWT_SECRET in the Railway auth-api service"
echo "  4. Trigger a Vercel redeploy to pick up the new env vars"
