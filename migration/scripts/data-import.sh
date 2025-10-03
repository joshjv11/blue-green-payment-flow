#!/bin/bash
set -e

# Load NEW project environment
source .env.new

echo "Connecting to NEW project: $NEW_PROJECT_REF"
NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

# Check for exported data
if [ ! -f exports/table-list.txt ]; then
  echo "ERROR: exports/table-list.txt not found. Run 'make data.export' first."
  exit 1
fi

# Determine import order (respecting FK dependencies)
# Tables with no dependencies first, then child tables
echo "Determining import order..."

# Create a dependency-sorted table order
psql "$NEW_DB_URL" -t -c "
  WITH RECURSIVE table_hierarchy AS (
    -- Tables with no foreign keys (roots)
    SELECT 
      t.tablename,
      0 as depth
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = t.tablename
          AND tc.constraint_type = 'FOREIGN KEY'
      )
    
    UNION ALL
    
    -- Tables with foreign keys (children)
    SELECT 
      t.tablename,
      th.depth + 1
    FROM pg_tables t
    JOIN information_schema.table_constraints tc 
      ON tc.table_schema = 'public' AND tc.table_name = t.tablename
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN table_hierarchy th
      ON th.tablename = ccu.table_name
    WHERE t.schemaname = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
  )
  SELECT DISTINCT tablename 
  FROM table_hierarchy 
  ORDER BY depth, tablename;
" | sed 's/^[[:space:]]*//' | grep -v '^$' > exports/table-order.txt

echo "Import order determined (FK-aware)"

# Disable triggers temporarily for faster import
echo "Disabling triggers and FK checks..."
psql "$NEW_DB_URL" -c "SET session_replication_role = 'replica';" > /dev/null 2>&1 || true

TABLE_COUNT=$(wc -l < exports/table-order.txt)
COUNTER=0
IMPORTED=0
SKIPPED=0

while IFS= read -r table; do
  COUNTER=$((COUNTER + 1))
  
  # Check if CSV exists
  if [ ! -f "exports/data/${table}.csv" ]; then
    echo "[$COUNTER/$TABLE_COUNT] SKIP $table (no CSV)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  echo "[$COUNTER/$TABLE_COUNT] Importing $table..."
  
  # Get row count from CSV
  CSV_ROWS=$(tail -n +2 "exports/data/${table}.csv" | wc -l)
  
  if [ "$CSV_ROWS" -eq 0 ]; then
    echo "  → Empty table, skipping"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  # Import CSV (using COPY for speed)
  psql "$NEW_DB_URL" -c "\COPY public.\"$table\" FROM 'exports/data/${table}.csv' WITH (FORMAT CSV, HEADER true, ENCODING 'UTF8');" 2>&1 | tee -a logs/import.log
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    IMPORTED=$((IMPORTED + 1))
    echo "  ✓ Imported $CSV_ROWS rows"
  else
    echo "  ✗ Import failed, check logs/import.log"
  fi
  
done < exports/table-order.txt

# Re-enable triggers
echo "Re-enabling triggers and FK checks..."
psql "$NEW_DB_URL" -c "SET session_replication_role = 'origin';" > /dev/null 2>&1 || true

echo ""
echo "========================================="
echo "Import Summary:"
echo "  Imported: $IMPORTED tables"
echo "  Skipped:  $SKIPPED tables"
echo "========================================="
