#!/bin/bash
set -e

# Load NEW project environment
source .env.new

echo "Connecting to NEW project: $NEW_PROJECT_REF"

# Build connection string
NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

# Check if schema dump exists
if [ ! -f exports/schema.sql ]; then
  echo "ERROR: exports/schema.sql not found. Run 'make schema.dump-old' first."
  exit 1
fi

echo "Applying schema to NEW project..."
psql "$NEW_DB_URL" -f exports/schema.sql > logs/schema-push.log 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Schema applied successfully"
else
  echo "⚠ Schema application had warnings/errors. Check logs/schema-push.log"
  tail -20 logs/schema-push.log
fi

# Verify critical extensions
echo "Verifying extensions..."
psql "$NEW_DB_URL" -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;" > logs/extensions.txt
echo "✓ Extensions listed in logs/extensions.txt"
