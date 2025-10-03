#!/bin/bash
set -e

source .env.old
source .env.new

echo "Checking PostgreSQL extensions..."
echo ""

OLD_DB_URL="postgresql://postgres:${OLD_SERVICE_ROLE_KEY}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"
NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

echo "Extensions on OLD project:"
psql "$OLD_DB_URL" -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"

echo ""
echo "Extensions on NEW project:"
psql "$NEW_DB_URL" -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"

echo ""
echo "✓ Extension check complete"
