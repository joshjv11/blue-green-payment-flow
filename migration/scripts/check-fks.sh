#!/bin/bash
set -e

source .env.new

NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

echo "Checking foreign key constraints on NEW project..."
echo ""

psql "$NEW_DB_URL" -c "
  SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name;
"

echo ""
echo "✓ Foreign key check complete"
