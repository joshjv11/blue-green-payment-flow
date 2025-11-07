-- Phase 4 Security Hardening
-- Enable email confirmation and enforce password policies
UPDATE auth.config
SET
  enable_email_confirm = TRUE,
  enable_signup = TRUE,
  enable_email_signup = TRUE,
  password_min_length = GREATEST(password_min_length, 10),
  password_require_upper = TRUE,
  password_require_lower = TRUE,
  password_require_numbers = TRUE,
  password_require_special = TRUE;

-- Optional: ensure Have I Been Pwned check is enabled
UPDATE auth.config
SET enable_hibp = TRUE;

-- Force all SECURITY DEFINER functions in public schema to set search_path=public
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO public;',
      rec.schema_name,
      rec.function_name,
      rec.args
    );
  END LOOP;
END;
$$;

-- Review SECURITY DEFINER views: none should exist. Drop placeholder if found.
DROP VIEW IF EXISTS public.admin_financial_metrics_view; -- placeholder safeguard
