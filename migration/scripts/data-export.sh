#!/bin/bash
set -e

# Load OLD project environment
source .env.old

echo "Connecting to OLD project: $OLD_PROJECT_REF"
OLD_DB_URL="postgresql://postgres:${OLD_SERVICE_ROLE_KEY}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"

# Get list of tables in public schema (excluding auth/storage)
echo "Discovering tables..."
psql "$OLD_DB_URL" -t -c "
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'auth_%'
    AND tablename NOT LIKE 'storage_%'
  ORDER BY tablename;
" | sed 's/^[[:space:]]*//' | grep -v '^$' > exports/table-list.txt

TABLE_COUNT=$(wc -l < exports/table-list.txt)
echo "Found $TABLE_COUNT tables to export"

# Export each table to CSV
COUNTER=0
while IFS= read -r table; do
  COUNTER=$((COUNTER + 1))
  echo "[$COUNTER/$TABLE_COUNT] Exporting $table..."
  
  # Get row count
  ROW_COUNT=$(psql "$OLD_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\";")
  echo "  → $ROW_COUNT rows"
  
  # Export to CSV with headers
  psql "$OLD_DB_URL" -c "\COPY (SELECT * FROM public.\"$table\") TO 'exports/data/${table}.csv' WITH (FORMAT CSV, HEADER true, ENCODING 'UTF8');"
  
  echo "  ✓ Exported to exports/data/${table}.csv"
done < exports/table-list.txt

echo ""
echo "✓ Exported $TABLE_COUNT tables"
echo "Total size: $(du -sh exports/data | cut -f1)"
