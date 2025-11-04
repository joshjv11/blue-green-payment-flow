-- ==========================================
-- GSTR Filing Tables (GSTR-1, GSTR-3B, ITC Reconciliation)
-- Premium Feature: DIY GST Filing
-- ==========================================

-- GSTR-1 Filing Records (Outward Supplies)
CREATE TABLE IF NOT EXISTS public.gstr1_filings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filing_period TEXT NOT NULL, -- Format: "YYYY-MM" for monthly, "YYYY-Q1/Q2/Q3/Q4" for quarterly
  filing_type TEXT NOT NULL CHECK (filing_type IN ('monthly', 'quarterly')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'filed', 'filed_late', 'cancelled')),
  gstin TEXT NOT NULL,
  arn TEXT, -- Application Reference Number from GSTN
  filing_date DATE,
  due_date DATE,
  json_data JSONB NOT NULL, -- Complete GSTR-1 JSON as per GSTN format
  summary_data JSONB, -- Summary totals for quick reference
  total_sales_value NUMERIC DEFAULT 0,
  total_taxable_value NUMERIC DEFAULT 0,
  total_tax_amount NUMERIC DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  filed_at TIMESTAMPTZ,
  UNIQUE(user_id, filing_period, filing_type)
);

-- GSTR-3B Filing Records (Monthly Summary)
CREATE TABLE IF NOT EXISTS public.gstr3b_filings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filing_period TEXT NOT NULL, -- Format: "YYYY-MM"
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'filed', 'filed_late', 'cancelled')),
  gstin TEXT NOT NULL,
  arn TEXT,
  filing_date DATE,
  due_date DATE,
  json_data JSONB NOT NULL, -- Complete GSTR-3B JSON as per GSTN format
  -- Summary fields for quick reference
  outward_supply_value NUMERIC DEFAULT 0,
  inward_supply_value NUMERIC DEFAULT 0,
  itc_available NUMERIC DEFAULT 0,
  itc_utilized NUMERIC DEFAULT 0,
  tax_payable NUMERIC DEFAULT 0,
  tax_paid NUMERIC DEFAULT 0,
  interest_payable NUMERIC DEFAULT 0,
  penalty_payable NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  filed_at TIMESTAMPTZ,
  UNIQUE(user_id, filing_period)
);

-- ITC Reconciliation (Input Tax Credit)
CREATE TABLE IF NOT EXISTS public.itc_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  gstin TEXT NOT NULL, -- Supplier GSTIN
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_value NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  itc_eligible NUMERIC NOT NULL, -- ITC amount eligible to claim
  itc_claimed NUMERIC DEFAULT 0, -- ITC amount claimed in returns
  -- Form 2A/2B data (from GSTN)
  form2a_2b_data JSONB, -- Data from GSTN Form 2A/2B
  form2a_2b_tax_amount NUMERIC, -- Tax amount from Form 2A/2B
  form2a_2b_status TEXT, -- 'matched', 'mismatch', 'missing', 'pending'
  mismatch_reason TEXT, -- Reason for mismatch if any
  reconciliation_status TEXT NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'matched', 'mismatch', 'missing', 'under_audit')),
  reconciled_at TIMESTAMPTZ,
  reconciled_by TEXT, -- User action or auto-reconciliation
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_number, invoice_date)
);

-- HSN Code Suggestions (AI-powered)
CREATE TABLE IF NOT EXISTS public.hsn_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_description TEXT NOT NULL,
  suggested_hsn TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0, -- 0-1 confidence score from AI
  ai_model TEXT, -- Which AI model was used (groq, openai, gemini)
  is_confirmed BOOLEAN DEFAULT false,
  actual_hsn TEXT, -- User confirmed HSN code
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Trail for GST Filings
CREATE TABLE IF NOT EXISTS public.gst_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filing_type TEXT NOT NULL CHECK (filing_type IN ('gstr1', 'gstr3b', 'itc_reconciliation')),
  filing_id UUID NOT NULL, -- Reference to gstr1_filings or gstr3b_filings
  action TEXT NOT NULL, -- 'created', 'updated', 'generated', 'filed', 'corrected', 'cancelled'
  old_value JSONB, -- Previous state (for updates)
  new_value JSONB, -- New state
  changed_fields TEXT[], -- Array of field names that changed
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Mismatch Alerts
CREATE TABLE IF NOT EXISTS public.gst_mismatch_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('itc_mismatch', 'form2a_mismatch', 'filing_mismatch', 'hsn_mismatch')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_filing_id UUID, -- Related GSTR filing
  related_invoice_id UUID, -- Related invoice
  related_itc_id UUID REFERENCES public.itc_reconciliation(id) ON DELETE SET NULL,
  mismatch_details JSONB, -- Detailed mismatch information
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gstr1_filings_user_id ON public.gstr1_filings(user_id);
CREATE INDEX IF NOT EXISTS idx_gstr1_filings_period ON public.gstr1_filings(filing_period, filing_type);
CREATE INDEX IF NOT EXISTS idx_gstr1_filings_status ON public.gstr1_filings(status);
CREATE INDEX IF NOT EXISTS idx_gstr1_filings_gstin ON public.gstr1_filings(gstin);

CREATE INDEX IF NOT EXISTS idx_gstr3b_filings_user_id ON public.gstr3b_filings(user_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_filings_period ON public.gstr3b_filings(filing_period);
CREATE INDEX IF NOT EXISTS idx_gstr3b_filings_status ON public.gstr3b_filings(status);
CREATE INDEX IF NOT EXISTS idx_gstr3b_filings_gstin ON public.gstr3b_filings(gstin);

CREATE INDEX IF NOT EXISTS idx_itc_reconciliation_user_id ON public.itc_reconciliation(user_id);
CREATE INDEX IF NOT EXISTS idx_itc_reconciliation_status ON public.itc_reconciliation(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_itc_reconciliation_purchase_order_id ON public.itc_reconciliation(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_itc_reconciliation_gstin ON public.itc_reconciliation(gstin);

CREATE INDEX IF NOT EXISTS idx_hsn_suggestions_user_id ON public.hsn_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_hsn_suggestions_description ON public.hsn_suggestions(product_description);

CREATE INDEX IF NOT EXISTS idx_gst_audit_trail_user_id ON public.gst_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_gst_audit_trail_filing_type ON public.gst_audit_trail(filing_type, filing_id);
CREATE INDEX IF NOT EXISTS idx_gst_audit_trail_changed_at ON public.gst_audit_trail(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_gst_mismatch_alerts_user_id ON public.gst_mismatch_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_gst_mismatch_alerts_resolved ON public.gst_mismatch_alerts(is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gst_mismatch_alerts_severity ON public.gst_mismatch_alerts(severity, is_resolved);

-- Enable RLS
ALTER TABLE public.gstr1_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gstr3b_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itc_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsn_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_mismatch_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for GSTR-1
CREATE POLICY "Users can view their own GSTR-1 filings"
  ON public.gstr1_filings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GSTR-1 filings"
  ON public.gstr1_filings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GSTR-1 filings"
  ON public.gstr1_filings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for GSTR-3B
CREATE POLICY "Users can view their own GSTR-3B filings"
  ON public.gstr3b_filings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GSTR-3B filings"
  ON public.gstr3b_filings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GSTR-3B filings"
  ON public.gstr3b_filings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for ITC Reconciliation
CREATE POLICY "Users can view their own ITC reconciliation"
  ON public.itc_reconciliation FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ITC reconciliation"
  ON public.itc_reconciliation FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ITC reconciliation"
  ON public.itc_reconciliation FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for HSN Suggestions
CREATE POLICY "Users can view their own HSN suggestions"
  ON public.hsn_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own HSN suggestions"
  ON public.hsn_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own HSN suggestions"
  ON public.hsn_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for Audit Trail
CREATE POLICY "Users can view their own audit trail"
  ON public.gst_audit_trail FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit trail"
  ON public.gst_audit_trail FOR INSERT
  WITH CHECK (true); -- System inserts, user_id is set by application

-- RLS Policies for Mismatch Alerts
CREATE POLICY "Users can view their own mismatch alerts"
  ON public.gst_mismatch_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mismatch alerts"
  ON public.gst_mismatch_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mismatch alerts"
  ON public.gst_mismatch_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.gstr1_filings IS 'GSTR-1 filings (Outward Supplies) - Monthly/Quarterly';
COMMENT ON TABLE public.gstr3b_filings IS 'GSTR-3B filings (Monthly Summary Return)';
COMMENT ON TABLE public.itc_reconciliation IS 'ITC reconciliation with Form 2A/2B from GSTN';
COMMENT ON TABLE public.hsn_suggestions IS 'AI-powered HSN code suggestions for products';
COMMENT ON TABLE public.gst_audit_trail IS 'Complete audit trail for CA review and compliance';
COMMENT ON TABLE public.gst_mismatch_alerts IS 'Alerts for mismatches between user data and GSTN data';

