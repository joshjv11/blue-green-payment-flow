-- Phase 2: Stripe ingest staging tables and sync job queue

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_sync_job_type') THEN
    CREATE TYPE public.gst_sync_job_type AS ENUM ('full_sync', 'invoice_event', 'payment_event');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gst_sync_job_status') THEN
    CREATE TYPE public.gst_sync_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stripe_invoices_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL,
  payload jsonb NOT NULL,
  latest_event_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, stripe_invoice_id)
);

CREATE TABLE IF NOT EXISTS public.stripe_payments_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL,
  payload jsonb NOT NULL,
  latest_event_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, stripe_payment_intent_id)
);

CREATE TABLE IF NOT EXISTS public.gst_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.gst_entities(id) ON DELETE CASCADE,
  job_type public.gst_sync_job_type NOT NULL,
  status public.gst_sync_job_status NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  run_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_raw_entity ON public.stripe_invoices_raw(entity_id, stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_raw_entity ON public.stripe_payments_raw(entity_id, stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_gst_sync_jobs_queue ON public.gst_sync_jobs(status, run_at);

-- updated_at triggers reuse handle_updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stripe_invoices_raw_updated_at') THEN
    CREATE TRIGGER trg_stripe_invoices_raw_updated_at
      BEFORE UPDATE ON public.stripe_invoices_raw
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stripe_payments_raw_updated_at') THEN
    CREATE TRIGGER trg_stripe_payments_raw_updated_at
      BEFORE UPDATE ON public.stripe_payments_raw
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_gst_sync_jobs_updated_at') THEN
    CREATE TRIGGER trg_gst_sync_jobs_updated_at
      BEFORE UPDATE ON public.gst_sync_jobs
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- enable rls
ALTER TABLE public.stripe_invoices_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payments_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_sync_jobs ENABLE ROW LEVEL SECURITY;

-- allow entity members to read staging data, but only service role inserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Members can read stripe invoices raw'
      AND tablename = 'stripe_invoices_raw'
  ) THEN
    CREATE POLICY "Members can read stripe invoices raw"
      ON public.stripe_invoices_raw
      FOR SELECT
      USING (public.gst_entity_is_member(entity_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages stripe invoices raw'
      AND tablename = 'stripe_invoices_raw'
  ) THEN
    CREATE POLICY "Service role manages stripe invoices raw"
      ON public.stripe_invoices_raw
      FOR ALL
      USING ((auth.jwt() ->> 'role') = 'service_role')
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Members can read stripe payments raw'
      AND tablename = 'stripe_payments_raw'
  ) THEN
    CREATE POLICY "Members can read stripe payments raw"
      ON public.stripe_payments_raw
      FOR SELECT
      USING (public.gst_entity_is_member(entity_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages stripe payments raw'
      AND tablename = 'stripe_payments_raw'
  ) THEN
    CREATE POLICY "Service role manages stripe payments raw"
      ON public.stripe_payments_raw
      FOR ALL
      USING ((auth.jwt() ->> 'role') = 'service_role')
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Members can read gst sync jobs'
      AND tablename = 'gst_sync_jobs'
  ) THEN
    CREATE POLICY "Members can read gst sync jobs"
      ON public.gst_sync_jobs
      FOR SELECT
      USING (public.gst_entity_is_member(entity_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages gst sync jobs'
      AND tablename = 'gst_sync_jobs'
  ) THEN
    CREATE POLICY "Service role manages gst sync jobs"
      ON public.gst_sync_jobs
      FOR ALL
      USING ((auth.jwt() ->> 'role') = 'service_role')
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

COMMENT ON TABLE public.stripe_invoices_raw IS 'Raw Stripe invoice payloads ingested for GST reconciliation.';
COMMENT ON TABLE public.stripe_payments_raw IS 'Raw Stripe payment intent payloads ingested for GST reconciliation.';
COMMENT ON TABLE public.gst_sync_jobs IS 'Queue of background jobs for syncing Stripe data and generating GST artifacts.';
