#!/bin/bash
set -e

# Auth Path A: Email-based user mapping
# Users will re-login on NEW project, and we remap FKs by email

source .env.old
source .env.new

echo "Auth Path A: Email-based user mapping"
echo "Users will need to re-login on the NEW project."
echo ""

OLD_DB_URL="postgresql://postgres:${OLD_SERVICE_ROLE_KEY}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"
NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

# Export user emails and IDs from OLD
echo "Exporting user emails from OLD project..."
psql "$OLD_DB_URL" -c "\COPY (
  SELECT id, email, LOWER(email) as email_lower, created_at
  FROM auth.users
  ORDER BY created_at
) TO 'exports/auth/old_users.csv' WITH CSV HEADER;"

OLD_USER_COUNT=$(tail -n +2 exports/auth/old_users.csv | wc -l)
echo "  → Exported $OLD_USER_COUNT users"

# Create remapping SQL script
cat > exports/auth/rekey_user_fks.sql <<'EOF'
-- Auth Path A: Remap user_id foreign keys by email
-- This script assumes users have re-registered on NEW project

-- Create temporary user mapping table
CREATE TEMP TABLE user_id_mapping AS
SELECT 
  old_users.id as old_user_id,
  new_users.id as new_user_id,
  old_users.email
FROM (
  SELECT * FROM (VALUES
    -- Will be replaced with actual values
    ${USER_MAPPINGS}
  ) AS t(id, email)
) AS old_users
LEFT JOIN auth.users new_users 
  ON LOWER(new_users.email) = LOWER(old_users.email);

-- Show mapping stats
SELECT 
  COUNT(*) as total_old_users,
  COUNT(new_user_id) as matched_users,
  COUNT(*) - COUNT(new_user_id) as unmatched_users
FROM user_id_mapping;

-- Update user_id in dependent tables
-- Customize this list based on your schema

-- Example: profiles table
UPDATE public.profiles p
SET id = m.new_user_id
FROM user_id_mapping m
WHERE p.id = m.old_user_id AND m.new_user_id IS NOT NULL;

-- Example: bills table
UPDATE public.bills b
SET user_id = m.new_user_id
FROM user_id_mapping m
WHERE b.user_id = m.old_user_id AND m.new_user_id IS NOT NULL;

-- Example: user_plans table
UPDATE public.user_plans up
SET user_id = m.new_user_id
FROM user_id_mapping m
WHERE up.user_id = m.old_user_id AND m.new_user_id IS NOT NULL;

-- Add more UPDATE statements for other tables with user_id FK

-- Report unmatched users
SELECT old_user_id, email 
FROM user_id_mapping 
WHERE new_user_id IS NULL;
EOF

echo ""
echo "✓ User email mapping prepared"
echo ""
echo "NEXT STEPS:"
echo "1. Users must register/login on NEW project"
echo "2. After data import, run: psql \$NEW_DB_URL -f exports/auth/rekey_user_fks.sql"
echo "3. This will remap all user_id foreign keys by matching emails"
echo ""
echo "NOTE: Users who don't re-register will have orphaned data."
