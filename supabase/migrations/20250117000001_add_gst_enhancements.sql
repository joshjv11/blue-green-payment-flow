-- GST Enhancements: Form 2B Cache, Filing Status, and ITC Mismatch Tracking

-- 1. Form 2B Cache Table (for hourly sync)
CREATE TABLE IF NOT EXISTS public.form2b_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL, -- Format: "YYYY-MM"
  data jsonb NOT NULL, -- Array of invoices from GSTR-2B
  synced_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_form2b_cache_user_period ON public.form2b_cache(user_id, period);
CREATE INDEX IF NOT EXISTS idx_form2b_cache_synced_at ON public.form2b_cache(synced_at);

-- RLS Policies
ALTER TABLE public.form2b_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own form2b_cache"
  ON public.form2b_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage form2b_cache"
  ON public.form2b_cache FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. GSTR Filing Status Table (if not exists)
CREATE TABLE IF NOT EXISTS public.gstr_filing_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filing_type text NOT NULL, -- 'gstr1' or 'gstr3b'
  filing_period text NOT NULL, -- Format: "YYYY-MM"
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'filed', 'rejected'
  acknowledgement_number text,
  filed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, filing_type, filing_period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gstr_filing_status_user ON public.gstr_filing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_gstr_filing_status_period ON public.gstr_filing_status(filing_period);
CREATE INDEX IF NOT EXISTS idx_gstr_filing_status_status ON public.gstr_filing_status(status);

-- RLS Policies
ALTER TABLE public.gstr_filing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own filing status"
  ON public.gstr_filing_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own filing status"
  ON public.gstr_filing_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filing status"
  ON public.gstr_filing_status FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. ITC Mismatch Alerts Table
CREATE TABLE IF NOT EXISTS public.itc_mismatch_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  invoice_number text,
  invoice_date date,
  supplier_gstin text,
  your_amount numeric(12,2),
  gstn_amount numeric(12,2),
  difference numeric(12,2),
  mismatch_type text, -- 'missing', 'amount_mismatch', 'date_mismatch'
  is_resolved boolean DEFAULT false,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itc_mismatch_user ON public.itc_mismatch_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_itc_mismatch_resolved ON public.itc_mismatch_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_itc_mismatch_created ON public.itc_mismatch_alerts(created_at);

-- RLS Policies
ALTER TABLE public.itc_mismatch_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mismatch alerts"
  ON public.itc_mismatch_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mismatch alerts"
  ON public.itc_mismatch_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mismatch alerts"
  ON public.itc_mismatch_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Function to get filing deadlines
CREATE OR REPLACE FUNCTION public.get_gst_filing_deadlines()
RETURNS TABLE(
  filing_type text,
  period text,
  due_date date,
  days_remaining int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date date := CURRENT_DATE;
  current_month int := EXTRACT(MONTH FROM current_date);
  current_year int := EXTRACT(YEAR FROM current_date);
  gstr1_due_date date;
  gstr3b_due_date date;
BEGIN
  -- GSTR-1 due date: 11th of next month
  IF current_month = 12 THEN
    gstr1_due_date := make_date(current_year + 1, 1, 11);
  ELSE
    gstr1_due_date := make_date(current_year, current_month + 1, 11);
  END IF;

  -- GSTR-3B due date: 20th of next month
  IF current_month = 12 THEN
    gstr3b_due_date := make_date(current_year + 1, 1, 20);
  ELSE
    gstr3b_due_date := make_date(current_year, current_month + 1, 20);
  END IF;

  RETURN QUERY
  SELECT 
    'gstr1'::text,
    to_char(current_date, 'YYYY-MM'),
    gstr1_due_date,
    (gstr1_due_date - current_date)::int
  UNION ALL
  SELECT 
    'gstr3b'::text,
    to_char(current_date, 'YYYY-MM'),
    gstr3b_due_date,
    (gstr3b_due_date - current_date)::int;
END;
$$;

-- 5. Function to check for pending invoices >30 days old (E-Invoice compliance)
CREATE OR REPLACE FUNCTION public.get_pending_einvoices_over_30_days(p_user_id uuid)
RETURNS TABLE(
  sales_order_id uuid,
  invoice_number text,
  invoice_date date,
  days_old int,
  irn text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.invoice_number,
    so.transaction_date::date,
    (CURRENT_DATE - so.transaction_date::date)::int AS days_old,
    so.irn
  FROM public.sales_orders so
  WHERE so.user_id = p_user_id
    AND (so.irn IS NULL OR so.irn = '')
    AND so.transaction_date < CURRENT_DATE - INTERVAL '25 days' -- Alert 5 days before 30-day deadline
    AND so.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY so.transaction_date ASC;
END;
$$;

