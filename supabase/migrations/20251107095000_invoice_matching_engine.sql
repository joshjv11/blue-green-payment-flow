-- Invoice matching core infrastructure

-- Extend purchase_orders with optional payment terms if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD COLUMN payment_terms TEXT;
  END IF;
END;
$$;

-- Goods receipts -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  supplier_name TEXT,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  sku TEXT,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_user_date ON public.goods_receipts(user_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON public.goods_receipts(purchase_order_id);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goods receipts" ON public.goods_receipts;
CREATE POLICY "Users manage own goods receipts"
  ON public.goods_receipts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage goods receipt lines" ON public.goods_receipt_lines;
CREATE POLICY "Users manage goods receipt lines"
  ON public.goods_receipt_lines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goods_receipts gr
      WHERE gr.id = goods_receipt_id AND gr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goods_receipts gr
      WHERE gr.id = goods_receipt_id AND gr.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_goods_receipts_updated_at ON public.goods_receipts;
CREATE TRIGGER trg_goods_receipts_updated_at
  BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice matches ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  invoice_id UUID,
  purchase_order_id UUID,
  goods_receipt_id UUID,
  vendor_name TEXT,
  match_type TEXT NOT NULL, -- '2_way', '3_way', 'partial', 'unmatched'
  confidence_score NUMERIC NOT NULL,
  flagged_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  requires_approval BOOLEAN DEFAULT FALSE,
  amount_variance NUMERIC,
  quantity_variance NUMERIC,
  payment_terms_variance BOOLEAN DEFAULT FALSE,
  duplicate_suspected BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_matches_workspace_status ON public.invoice_matches(workspace_id, requires_approval);
CREATE INDEX IF NOT EXISTS idx_invoice_matches_vendor_date ON public.invoice_matches(vendor_name, created_at DESC);

ALTER TABLE public.invoice_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read invoice matches" ON public.invoice_matches;
CREATE POLICY "Workspace members read invoice matches"
  ON public.invoice_matches
  FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Workspace members insert invoice matches" ON public.invoice_matches;
CREATE POLICY "Workspace members insert invoice matches"
  ON public.invoice_matches
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Workspace members update invoice matches" ON public.invoice_matches;
CREATE POLICY "Workspace members update invoice matches"
  ON public.invoice_matches
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP TRIGGER IF EXISTS trg_invoice_matches_updated_at ON public.invoice_matches;
CREATE TRIGGER trg_invoice_matches_updated_at
  BEFORE UPDATE ON public.invoice_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feedback table for reinforcement learning ---------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_match_id UUID NOT NULL REFERENCES public.invoice_matches(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  vendor_name TEXT,
  reviewer_id UUID NOT NULL,
  is_correct BOOLEAN NOT NULL,
  feedback_notes TEXT,
  approved_amount NUMERIC,
  approved_quantity NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_match_feedback_vendor ON public.invoice_match_feedback(vendor_name);
CREATE INDEX IF NOT EXISTS idx_invoice_match_feedback_workspace ON public.invoice_match_feedback(workspace_id);

ALTER TABLE public.invoice_match_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members manage match feedback" ON public.invoice_match_feedback;
CREATE POLICY "Workspace members manage match feedback"
  ON public.invoice_match_feedback
  FOR ALL
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Vendor model profiles ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_matching_profiles (
  workspace_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  invoice_count INTEGER NOT NULL DEFAULT 0,
  mean_amount NUMERIC NOT NULL DEFAULT 0,
  std_dev_amount NUMERIC NOT NULL DEFAULT 0,
  approval_rate NUMERIC NOT NULL DEFAULT 0,
  last_feedback_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, vendor_name)
);

ALTER TABLE public.vendor_matching_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members manage vendor profiles" ON public.vendor_matching_profiles;
CREATE POLICY "Workspace members manage vendor profiles"
  ON public.vendor_matching_profiles
  FOR ALL
  USING (auth.uid() = workspace_id)
  WITH CHECK (auth.uid() = workspace_id);

DROP TRIGGER IF EXISTS trg_vendor_matching_profiles_updated_at ON public.vendor_matching_profiles;
CREATE TRIGGER trg_vendor_matching_profiles_updated_at
  BEFORE UPDATE ON public.vendor_matching_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aggregate function to refresh vendor matching profile
CREATE OR REPLACE FUNCTION public.refresh_vendor_matching_profile(p_workspace_id UUID, p_vendor_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mean NUMERIC := 0;
  v_stddev NUMERIC := 0;
  v_count INTEGER := 0;
  v_approval_rate NUMERIC := 0;
  v_last_feedback TIMESTAMPTZ := NULL;
BEGIN
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(AVG((metadata->>'invoiceAmount')::NUMERIC), AVG(confidence_score)),
    COALESCE(STDDEV_POP((metadata->>'invoiceAmount')::NUMERIC), 0)
  INTO
    v_count,
    v_mean,
    v_stddev
  FROM public.invoice_matches
  WHERE workspace_id = p_workspace_id
    AND vendor_name = p_vendor_name;

  SELECT
    COALESCE(AVG(CASE WHEN is_correct THEN 1 ELSE 0 END), 0),
    MAX(created_at)
  INTO
    v_approval_rate,
    v_last_feedback
  FROM public.invoice_match_feedback
  WHERE workspace_id = p_workspace_id
    AND vendor_name = p_vendor_name;

  INSERT INTO public.vendor_matching_profiles (
    workspace_id,
    vendor_name,
    invoice_count,
    mean_amount,
    std_dev_amount,
    approval_rate,
    last_feedback_at
  )
  VALUES (
    p_workspace_id,
    p_vendor_name,
    COALESCE(v_count, 0),
    COALESCE(v_mean, 0),
    COALESCE(v_stddev, 0),
    COALESCE(v_approval_rate, 0),
    v_last_feedback
  )
  ON CONFLICT (workspace_id, vendor_name) DO UPDATE
  SET
    invoice_count = EXCLUDED.invoice_count,
    mean_amount = EXCLUDED.mean_amount,
    std_dev_amount = EXCLUDED.std_dev_amount,
    approval_rate = EXCLUDED.approval_rate,
    last_feedback_at = EXCLUDED.last_feedback_at,
    updated_at = now();
END;
$$;

-- Helper to expose stats to the app
CREATE OR REPLACE FUNCTION public.get_vendor_invoice_stats(p_workspace_id UUID, p_vendor_name TEXT)
RETURNS TABLE(
  count INTEGER,
  mean_amount NUMERIC,
  std_dev_amount NUMERIC,
  approval_rate NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    invoice_count,
    mean_amount,
    std_dev_amount,
    approval_rate
  FROM public.vendor_matching_profiles
  WHERE workspace_id = p_workspace_id
    AND vendor_name = p_vendor_name;
$$;

-- Trigger to refresh vendor profile when feedback arrives
DROP TRIGGER IF EXISTS trg_invoice_match_feedback_refresh ON public.invoice_match_feedback;
CREATE TRIGGER trg_invoice_match_feedback_refresh
  AFTER INSERT OR UPDATE ON public.invoice_match_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_vendor_matching_profile(NEW.workspace_id, NEW.vendor_name);

