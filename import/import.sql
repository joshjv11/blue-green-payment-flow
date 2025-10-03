-- CSV Import Script for NEW Supabase Project
-- Place your CSV files in the import/ directory before running
-- Usage: psql $DATABASE_URL -f import/import.sql

BEGIN;

-- Disable RLS temporarily for import (service role should bypass anyway)
SET session_replication_role = 'replica';

-- ============================================================
-- PROFILES IMPORT
-- ============================================================
CREATE TEMP TABLE IF NOT EXISTS temp_profiles (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  company TEXT,
  is_admin BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Load from CSV (adjust path if needed)
-- \copy temp_profiles FROM 'import/profiles.csv' WITH (FORMAT csv, HEADER true);

-- Upsert into real table
INSERT INTO public.profiles (id, user_id, email, full_name, company, is_admin, is_active, created_at, updated_at)
SELECT id, user_id, email, full_name, company, is_admin, is_active, created_at, updated_at
FROM temp_profiles
ON CONFLICT (user_id) DO NOTHING;

SELECT format('✅ Imported %s profiles', count(*)) FROM temp_profiles;

DROP TABLE temp_profiles;

-- ============================================================
-- BILLS IMPORT
-- ============================================================
CREATE TEMP TABLE IF NOT EXISTS temp_bills (
  id UUID,
  user_id UUID,
  title TEXT,
  amount NUMERIC(10,2),
  due_date DATE,
  client_email TEXT,
  client_name TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Load from CSV
-- \copy temp_bills FROM 'import/bills.csv' WITH (FORMAT csv, HEADER true);

-- Upsert into real table
INSERT INTO public.bills (id, user_id, title, amount, due_date, client_email, client_name, status, notes, created_at, updated_at)
SELECT id, user_id, title, amount, due_date, client_email, client_name, status, notes, created_at, updated_at
FROM temp_bills
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Imported %s bills', count(*)) FROM temp_bills;

DROP TABLE temp_bills;

-- ============================================================
-- REMINDERS IMPORT
-- ============================================================
CREATE TEMP TABLE IF NOT EXISTS temp_reminders (
  id UUID,
  bill_id UUID,
  user_id UUID,
  reminder_date TIMESTAMPTZ,
  reminder_type TEXT,
  sent BOOLEAN,
  created_at TIMESTAMPTZ
);

-- Load from CSV
-- \copy temp_reminders FROM 'import/reminders.csv' WITH (FORMAT csv, HEADER true);

-- Upsert into real table
INSERT INTO public.reminders (id, bill_id, user_id, reminder_date, reminder_type, sent, created_at)
SELECT id, bill_id, user_id, reminder_date, reminder_type, sent, created_at
FROM temp_reminders
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Imported %s reminders', count(*)) FROM temp_reminders;

DROP TABLE temp_reminders;

-- Re-enable RLS
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'profiles' as table_name, count(*) as row_count FROM public.profiles
UNION ALL
SELECT 'bills', count(*) FROM public.bills
UNION ALL
SELECT 'reminders', count(*) FROM public.reminders;

SELECT '✅ Import complete! Verify row counts above match your expectations.' as status;
