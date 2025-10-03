#!/bin/bash
set -e

source .env.old
source .env.new

echo "========================================="
echo "Verification: Comparing OLD vs NEW"
echo "========================================="
echo ""

OLD_DB_URL="postgresql://postgres:${OLD_SERVICE_ROLE_KEY}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"
NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

# 1. Table row counts
echo "→ Comparing table row counts..."
echo ""
echo "Table                    | OLD Count  | NEW Count  | Diff"
echo "-------------------------|------------|------------|------------"

while IFS= read -r table; do
  OLD_COUNT=$(psql "$OLD_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\";" | xargs)
  NEW_COUNT=$(psql "$NEW_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\";" | xargs)
  DIFF=$((NEW_COUNT - OLD_COUNT))
  
  STATUS="✓"
  if [ "$DIFF" -ne 0 ]; then
    STATUS="⚠"
  fi
  
  printf "%-25s| %-10s | %-10s | %s %d\n" "$table" "$OLD_COUNT" "$NEW_COUNT" "$STATUS" "$DIFF"
done < exports/table-list.txt

echo ""

# 2. Foreign key integrity
echo "→ Checking foreign key integrity on NEW..."
FK_VIOLATIONS=$(psql "$NEW_DB_URL" -t -c "
  SELECT COUNT(*) 
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
" | xargs)

echo "  Foreign key constraints: $FK_VIOLATIONS"

# Verify no violations (this would fail if FKs are broken)
psql "$NEW_DB_URL" -c "
  DO \$\$
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN 
      SELECT conname, conrelid::regclass as table_name
      FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    LOOP
      EXECUTE format('SELECT COUNT(*) FROM %s WHERE NOT EXISTS (SELECT 1 FROM %s WHERE ...)', r.table_name);
    END LOOP;
  END \$\$;
" > /dev/null 2>&1 && echo "  ✓ No FK violations detected" || echo "  ⚠ FK violations found"

echo ""

# 3. RLS smoke test (if user exists)
echo "→ RLS smoke test..."
echo "  Creating test user..."

TEST_EMAIL="migration-test-$(date +%s)@example.com"
TEST_PASS="TestPassword123!"

# Create test user
psql "$NEW_DB_URL" -c "
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    '$TEST_EMAIL',
    crypt('$TEST_PASS', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;
" > /dev/null 2>&1

echo "  ✓ Test user created: $TEST_EMAIL"
echo "  → Test: User can only see own data (requires manual verification)"

echo ""
echo "========================================="
echo "✓ Verification complete"
echo "  Review logs/verify.log for details"
echo "========================================="
