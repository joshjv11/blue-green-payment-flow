-- GST Compliance Platform Schema
-- Phase 1: Core tables, enums, helper functions, RLS policies, and views

-- Ensure helper extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_function_is_visible(oid)
  ) THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$;
  END IF;
END $$;

-- Enumerated types -------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_tax_component') THEN
    CREATE TYPE public.gst_tax_component AS ENUM ('cgst', 'sgst', 'igst', 'cess');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_invoice_source') THEN
    CREATE TYPE public.gst_invoice_source AS ENUM ('stripe', 'manual', 'import', 'adjustment');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_report_status') THEN
    CREATE TYPE public.gst_report_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_alert_type') THEN
    CREATE TYPE public.gst_alert_type AS ENUM ('discrepancy', 'threshold', 'deadline', 'system');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_alert_severity') THEN
    CREATE TYPE public.gst_alert_severity AS ENUM ('info', 'warning', 'critical');
  END IF;
END $$;

-- Helper function to evaluate entity membership -------------------------
CREATE OR REPLACE FUNCTION public.gst_entity_is_member(p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gst_entities ge
    WHERE ge.id = p_entity_id
      AND ge.owner_id = auth.uid()
  );
$$;

-- Core tables ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gst_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  legal_name text,
  gstin_encrypted text,
  state_code text,
  forecast_threshold numeric(14,2) DEFAULT 0,
  stripe_customer_id text,
  consultant_contact_encrypted jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, business_name)
);

CREATE TABLE IF NOT EXISTS public.gst_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  customer_name text,
  customer_identifier text,
  customer_state_code text,
  gst_rate numeric(5,2) NOT NULL,
  taxable_value numeric(14,2) NOT NULL,
  total_tax numeric(14,2) NOT NULL,
  cgst_amount numeric(14,2) DEFAULT 0,
  sgst_amount numeric(14,2) DEFAULT 0,
  igst_amount numeric(14,2) DEFAULT 0,
  cess_amount numeric(14,2) DEFAULT 0,
  place_of_supply text,
  gst_status text DEFAULT 'pending',
  source public.gst_invoice_source NOT NULL,
  stripe_invoice_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.gst_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.gst_invoices(id) ON DELETE CASCADE,
  stripe_line_item_id text,
  description text,
  hsn_sac_code text,
  quantity numeric(14,4) DEFAULT 1,
  unit_price numeric(14,4) DEFAULT 0,
  taxable_value numeric(14,2) NOT NULL,
  gst_rate numeric(5,2) NOT NULL,
  cgst_amount numeric(14,2) DEFAULT 0,
  sgst_amount numeric(14,2) DEFAULT 0,
  igst_amount numeric(14,2) DEFAULT 0,
  cess_amount numeric(14,2) DEFAULT 0,
  source public.gst_invoice_source NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_line_item_id)
);

CREATE TABLE IF NOT EXISTS public.gst_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.gst_invoices(id) ON DELETE SET NULL,
  calculation_version integer NOT NULL DEFAULT 1,
  trigger_source text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  input_payload jsonb NOT NULL,
  result_payload jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.gst_invoices(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL,
  paid_at timestamptz,
  reconciled boolean NOT NULL DEFAULT false,
  reconciliation_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_liability_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  taxable_total numeric(16,2) NOT NULL DEFAULT 0,
  cgst_total numeric(16,2) NOT NULL DEFAULT 0,
  sgst_total numeric(16,2) NOT NULL DEFAULT 0,
  igst_total numeric(16,2) NOT NULL DEFAULT 0,
  cess_total numeric(16,2) NOT NULL DEFAULT 0,
  itc_claimed numeric(16,2) NOT NULL DEFAULT 0,
  net_liability numeric(16,2) NOT NULL DEFAULT 0,
  last_recalculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.gst_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  forecast_liability numeric(16,2) NOT NULL,
  confidence_low numeric(16,2),
  confidence_high numeric(16,2),
  method text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, period_month, method)
);

CREATE TABLE IF NOT EXISTS public.gst_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  status public.gst_report_status NOT NULL DEFAULT 'pending',
  storage_path text,
  checksum text,
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.gst_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  alert_type public.gst_alert_type NOT NULL,
  severity public.gst_alert_severity NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_notes text,
  acknowledged boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.gst_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  actor_type text,
  target_table text NOT NULL,
  target_id uuid,
  action text NOT NULL,
  change_summary jsonb,
  diff jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Staging and queue tables for Stripe ingest -----------------------------
CREATE TABLE IF NOT EXISTS public.stripe_invoices_raw (
  id text PRIMARY KEY,
  entity_id uuid REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_payments_raw (
  id text PRIMARY KEY,
  entity_id uuid REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  stripe_object_id text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gst_invoices_entity_date ON public.gst_invoices(entity_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_stripe ON public.gst_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoice_items_invoice ON public.gst_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_gst_calculations_invoice ON public.gst_calculations(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gst_payments_entity ON public.gst_payments(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_gst_liability_monthly_entity ON public.gst_liability_monthly(entity_id, period_month);
CREATE INDEX IF NOT EXISTS idx_gst_forecasts_entity ON public.gst_forecasts(entity_id, period_month);
CREATE INDEX IF NOT EXISTS idx_gst_alerts_entity ON public.gst_alerts(entity_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_gst_audit_entity ON public.gst_audit_trail(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_raw_synced ON public.stripe_invoices_raw(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_raw_synced ON public.stripe_payments_raw(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_gst_sync_jobs_status ON public.gst_sync_jobs(status, scheduled_at);

-- Updated_at triggers ----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gst_entities_updated_at') THEN
    CREATE TRIGGER trg_gst_entities_updated_at
      BEFORE UPDATE ON public.gst_entities
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gst_invoices_updated_at') THEN
    CREATE TRIGGER trg_gst_invoices_updated_at
      BEFORE UPDATE ON public.gst_invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gst_invoice_items_updated_at') THEN
    CREATE TRIGGER trg_gst_invoice_items_updated_at
      BEFORE UPDATE ON public.gst_invoice_items
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gst_payments_updated_at') THEN
    CREATE TRIGGER trg_gst_payments_updated_at
      BEFORE UPDATE ON public.gst_payments
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gst_reports_updated_at') THEN
    CREATE TRIGGER trg_gst_reports_updated_at
      BEFORE UPDATE ON public.gst_reports
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Row level security -----------------------------------------------------
ALTER TABLE public.gst_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_liability_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_invoices_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payments_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Policies: gst_entities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage GST entities' AND tablename = 'gst_entities'
  ) THEN
    CREATE POLICY "Owners can manage GST entities"
      ON public.gst_entities
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- General helper to avoid duplication when defining policies
CREATE OR REPLACE FUNCTION public.ensure_policy(
  p_name text,
  p_table text,
  p_cmd text,
  p_using text,
  p_check text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = p_name AND tablename = p_table
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s USING (%s)%s',
      p_name,
      p_table,
      p_cmd,
      p_using,
      CASE WHEN p_check IS NOT NULL THEN format(' WITH CHECK (%s)', p_check) ELSE '' END
    );
  END IF;
END;
$$;

-- Policies leveraging helper --------------------------------------------
SELECT public.ensure_policy(
  'Members can read invoices',
  'gst_invoices',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can modify invoices',
  'gst_invoices',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can update invoices',
  'gst_invoices',
  'UPDATE',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read invoice items',
  'gst_invoice_items',
  'SELECT',
  'public.gst_entity_is_member((SELECT entity_id FROM public.gst_invoices gi WHERE gi.id = invoice_id))',
  NULL
);

SELECT public.ensure_policy(
  'Members can modify invoice items',
  'gst_invoice_items',
  'INSERT',
  'public.gst_entity_is_member((SELECT entity_id FROM public.gst_invoices gi WHERE gi.id = invoice_id))',
  'public.gst_entity_is_member((SELECT entity_id FROM public.gst_invoices gi WHERE gi.id = invoice_id))'
);

SELECT public.ensure_policy(
  'Members can update invoice items',
  'gst_invoice_items',
  'UPDATE',
  'public.gst_entity_is_member((SELECT entity_id FROM public.gst_invoices gi WHERE gi.id = invoice_id))',
  'public.gst_entity_is_member((SELECT entity_id FROM public.gst_invoices gi WHERE gi.id = invoice_id))'
);

SELECT public.ensure_policy(
  'Members can read calculations',
  'gst_calculations',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can insert calculations',
  'gst_calculations',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read payments',
  'gst_payments',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can modify payments',
  'gst_payments',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can update payments',
  'gst_payments',
  'UPDATE',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read monthly liability',
  'gst_liability_monthly',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can upsert monthly liability',
  'gst_liability_monthly',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can update monthly liability',
  'gst_liability_monthly',
  'UPDATE',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read forecasts',
  'gst_forecasts',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can insert forecasts',
  'gst_forecasts',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read reports',
  'gst_reports',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can insert reports',
  'gst_reports',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can update reports',
  'gst_reports',
  'UPDATE',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read alerts',
  'gst_alerts',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can manage alerts',
  'gst_alerts',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can resolve alerts',
  'gst_alerts',
  'UPDATE',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read audit trail',
  'gst_audit_trail',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'System can insert audit trail',
  'gst_audit_trail',
  'INSERT',
  'true',
  'true'
);

SELECT public.ensure_policy(
  'Members can read stripe invoices raw',
  'stripe_invoices_raw',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'System can write stripe invoices raw',
  'stripe_invoices_raw',
  'INSERT',
  'true',
  'true'
);

SELECT public.ensure_policy(
  'Members can read stripe payments raw',
  'stripe_payments_raw',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'System can write stripe payments raw',
  'stripe_payments_raw',
  'INSERT',
  'true',
  'true'
);

SELECT public.ensure_policy(
  'Members can read sync jobs',
  'gst_sync_jobs',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'System can manage sync jobs',
  'gst_sync_jobs',
  'INSERT',
  'true',
  'true'
);

SELECT public.ensure_policy(
  'System can update sync jobs',
  'gst_sync_jobs',
  'UPDATE',
  'true',
  'true'
);

-- Drop helper once policies created to avoid clutter
DROP FUNCTION IF EXISTS public.ensure_policy(text, text, text, text, text);

-- Views ------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_gst_invoice_tax_breakdown;
CREATE VIEW public.vw_gst_invoice_tax_breakdown AS
SELECT
  gi.id AS invoice_id,
  gi.entity_id,
  gi.invoice_number,
  gi.invoice_date,
  gi.customer_name,
  gi.taxable_value,
  gi.total_tax,
  gi.cgst_amount,
  gi.sgst_amount,
  gi.igst_amount,
  gi.source,
  calc.result_payload ->> 'netTax' AS calculated_tax,
  calc.result_payload,
  gi.metadata
FROM public.gst_invoices gi
LEFT JOIN LATERAL (
  SELECT gc.*
  FROM public.gst_calculations gc
  WHERE gc.invoice_id = gi.id
  ORDER BY gc.created_at DESC
  LIMIT 1
) calc ON TRUE;

DROP VIEW IF EXISTS public.vw_gst_stripe_reconciliation;
CREATE VIEW public.vw_gst_stripe_reconciliation AS
SELECT
  gi.entity_id,
  gi.invoice_number,
  gi.invoice_date,
  gi.taxable_value,
  gi.total_tax,
  gp.amount AS payment_amount,
  gp.status AS payment_status,
  gp.paid_at,
  gi.stripe_invoice_id,
  (gp.reconciled AND gp.status = 'succeeded') AS is_reconciled
FROM public.gst_invoices gi
LEFT JOIN public.gst_payments gp ON gp.invoice_id = gi.id;

DROP VIEW IF EXISTS public.vw_gst_monthly_dashboard;
CREATE VIEW public.vw_gst_monthly_dashboard AS
SELECT
  glm.entity_id,
  glm.period_month,
  glm.taxable_total,
  glm.cgst_total,
  glm.sgst_total,
  glm.igst_total,
  glm.cess_total,
  glm.net_liability,
  gf.forecast_liability,
  gf.confidence_low,
  gf.confidence_high,
  gf.generated_at AS forecast_generated_at
FROM public.gst_liability_monthly glm
LEFT JOIN LATERAL (
  SELECT *
  FROM public.gst_forecasts gf
  WHERE gf.entity_id = glm.entity_id
    AND gf.period_month = glm.period_month
  ORDER BY gf.generated_at DESC
  LIMIT 1
) gf ON TRUE;

COMMENT ON TABLE public.gst_entities IS 'Registered GST business entities managed within the platform.';
COMMENT ON TABLE public.gst_invoices IS 'Normalized invoice ledger with GST tax splits per entity.';
COMMENT ON TABLE public.gst_invoice_items IS 'Line-level detail for GST invoices including HSN/SAC codes.';
COMMENT ON TABLE public.gst_calculations IS 'Snapshot of each GST calculation execution for auditability.';
COMMENT ON TABLE public.gst_payments IS 'Stripe payment records linked to GST invoices for reconciliation.';
COMMENT ON TABLE public.gst_liability_monthly IS 'Monthly GST liability aggregates per entity.';
COMMENT ON TABLE public.gst_forecasts IS 'Forecasted GST liability produced via BigQuery or ML models.';
COMMENT ON TABLE public.gst_reports IS 'Generated GST compliance reports with storage references.';
COMMENT ON TABLE public.gst_alerts IS 'Alert log for discrepancies, deadlines, and threshold warnings.';
COMMENT ON TABLE public.gst_audit_trail IS 'Comprehensive audit log for GST-related changes.';

-- ------------------------------------------------------------------------
-- Stripe ingest staging + job tables
-- ------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stripe_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'full_sync',
  status text NOT NULL DEFAULT 'pending',
  result_summary jsonb DEFAULT '{}'::jsonb,
  cursor_invoices text,
  cursor_payments text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.stripe_invoices_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL,
  payload jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, stripe_invoice_id)
);

CREATE TABLE IF NOT EXISTS public.stripe_payments_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL,
  payload jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, stripe_payment_intent_id)
);

ALTER TABLE public.stripe_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_invoices_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payments_raw ENABLE ROW LEVEL SECURITY;

SELECT public.ensure_policy(
  'Members can manage stripe jobs',
  'stripe_sync_jobs',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can insert stripe jobs',
  'stripe_sync_jobs',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can update stripe jobs',
  'stripe_sync_jobs',
  'UPDATE',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read stripe invoices raw',
  'stripe_invoices_raw',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can upsert stripe invoices raw',
  'stripe_invoices_raw',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

SELECT public.ensure_policy(
  'Members can read stripe payments raw',
  'stripe_payments_raw',
  'SELECT',
  'public.gst_entity_is_member(entity_id)',
  NULL
);

SELECT public.ensure_policy(
  'Members can upsert stripe payments raw',
  'stripe_payments_raw',
  'INSERT',
  'public.gst_entity_is_member(entity_id)',
  'public.gst_entity_is_member(entity_id)'
);

COMMENT ON TABLE public.stripe_invoices_raw IS 'Raw Stripe invoice payloads for idempotent sync.';
COMMENT ON TABLE public.stripe_payments_raw IS 'Raw Stripe payment payloads for idempotent sync.';
COMMENT ON TABLE public.stripe_sync_jobs IS 'Queue of sync and reconciliation jobs for Stripe/GST automation.';

DROP FUNCTION IF EXISTS public.ensure_policy(text, text, text, text, text);
