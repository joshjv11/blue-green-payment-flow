#!/bin/bash
set -e

# Load OLD project environment
source .env.old

echo "Connecting to OLD project: $OLD_PROJECT_REF"

# Build connection string
OLD_DB_URL="postgresql://postgres:${OLD_SERVICE_ROLE_KEY}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"

# Dump schema using pg_dump
pg_dump "$OLD_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-security-labels \
  --no-subscriptions \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=net \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=realtime \
  --exclude-schema=storage \
  --exclude-schema=supabase_functions \
  --exclude-schema=vault \
  --exclude-table='auth.*' \
  --exclude-table='storage.*' \
  > exports/schema.sql

# Make schema idempotent by adding IF NOT EXISTS and OR REPLACE
sed -i.bak 's/CREATE TABLE /CREATE TABLE IF NOT EXISTS /g' exports/schema.sql
sed -i.bak 's/CREATE INDEX /CREATE INDEX IF NOT EXISTS /g' exports/schema.sql
sed -i.bak 's/CREATE UNIQUE INDEX /CREATE UNIQUE INDEX IF NOT EXISTS /g' exports/schema.sql
sed -i.bak 's/CREATE FUNCTION /CREATE OR REPLACE FUNCTION /g' exports/schema.sql
sed -i.bak 's/CREATE TYPE /CREATE TYPE IF NOT EXISTS /g' exports/schema.sql
rm exports/schema.sql.bak

echo "✓ Schema dumped: $(wc -l < exports/schema.sql) lines"

# Also dump RLS policies separately for clarity
psql "$OLD_DB_URL" -c "
  SELECT schemaname, tablename, policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
" > exports/rls-policies.txt

echo "✓ RLS policies exported to exports/rls-policies.txt"
