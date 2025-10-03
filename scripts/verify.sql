-- ============================================
-- Supabase Health Check & Verification Script
-- ============================================
-- Run with: psql $DATABASE_URL -f scripts/verify.sql
-- Or: make verify

\echo '🔍 Starting Supabase Health Check...\n'

-- 1. Check Extensions
\echo '📦 Extensions:'
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp', 'pg_stat_statements')
ORDER BY extname;

\echo '\n'

-- 2. Row Counts
\echo '📊 Row Counts:'
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count 
FROM public.profiles
UNION ALL
SELECT 
  'bills' as table_name,
  COUNT(*) as row_count 
FROM public.bills
UNION ALL
SELECT 
  'reminders' as table_name,
  COUNT(*) as row_count 
FROM public.reminders
UNION ALL
SELECT 
  'customers' as table_name,
  COUNT(*) as row_count 
FROM public.customers
UNION ALL
SELECT 
  'invoices' as table_name,
  COUNT(*) as row_count 
FROM public.invoices
ORDER BY table_name;

\echo '\n'

-- 3. Foreign Key Constraints
\echo '🔗 Foreign Key Constraints:'
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo '\n'

-- 4. RLS Status
\echo '🔒 Row Level Security Status:'
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo '\n'

-- 5. RLS Policies
\echo '📋 RLS Policies:'
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo '\n'

-- 6. Triggers
\echo '⚡ Triggers:'
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement as action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo '\n'

-- 7. Indexes
\echo '📇 Indexes:'
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

\echo '\n'

-- 8. Check for NULL PKs (should be none)
\echo '🚫 NULL Primary Keys (should be empty):'
SELECT 'profiles' as table_name, COUNT(*) as null_pk_count 
FROM public.profiles WHERE id IS NULL
UNION ALL
SELECT 'bills' as table_name, COUNT(*) as null_pk_count 
FROM public.bills WHERE id IS NULL
UNION ALL
SELECT 'reminders' as table_name, COUNT(*) as null_pk_count 
FROM public.reminders WHERE id IS NULL;

\echo '\n'

-- 9. Test auth.uid() context
\echo '🔐 Auth Context Test:'
SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN '✅ No active session (expected in SQL context)'
    ELSE '⚠️  Active session detected: ' || auth.uid()::text
  END as auth_status;

\echo '\n'

-- 10. Recent Activity
\echo '📅 Recent Activity:'
SELECT 
  'profiles' as table_name,
  MAX(created_at) as latest_created,
  MAX(updated_at) as latest_updated
FROM public.profiles
UNION ALL
SELECT 
  'bills' as table_name,
  MAX(created_at) as latest_created,
  MAX(updated_at) as latest_updated
FROM public.bills
UNION ALL
SELECT 
  'reminders' as table_name,
  MAX(created_at) as latest_created,
  NULL as latest_updated
FROM public.reminders
ORDER BY table_name;

\echo '\n✅ Health Check Complete!\n'
