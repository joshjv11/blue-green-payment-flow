-- Seed demo data for GST flows (use for local demos / QA)

-- Ensure required tables exist before seeding. Safe to re-run.
DO $$ BEGIN
  IF to_regclass('public.gstn_credentials') IS NULL THEN
    RAISE NOTICE 'Skipping seed: gstn_credentials table missing';
    RETURN;
  END IF;
END $$;

-- Upsert demo user
INSERT INTO public.profiles (id, email, full_name, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-premium@invoiceflow.dev', 'Demo Premium User', '+919876543210')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- Ensure the user has an active plan
INSERT INTO public.user_plans (user_id, plan, status, started_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'gst_pro', 'active', now())
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at;

-- Seed GSTN credentials for demo user
INSERT INTO public.gstn_credentials (user_id, gstin, username, password_encrypted, api_endpoint, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '27ABCDE1234F1Z5',
  'demo_user',
  encrypt_gstn_password('S3cureDemoPass!'),
  'https://sandbox.gst.gov.in',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  gstin = EXCLUDED.gstin,
  username = EXCLUDED.username,
  password_encrypted = EXCLUDED.password_encrypted,
  api_endpoint = EXCLUDED.api_endpoint,
  is_active = true;

-- Seed recent GSTR-1 filings
INSERT INTO public.gstr1_filings (user_id, filing_period, status, filed_at, reference_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  to_char(date_trunc('month', now()) - (interval '1 month' * gs), 'YYYY-MM'),
  CASE WHEN gs = 0 THEN 'filed' ELSE 'pending' END,
  now() - (interval '30 days' * gs),
  concat('GSTR1-DEMO-', gs)
FROM generate_series(0, 5) AS gs
ON CONFLICT (user_id, filing_period) DO UPDATE SET
  status = EXCLUDED.status,
  filed_at = EXCLUDED.filed_at,
  reference_id = EXCLUDED.reference_id;

-- Seed GSTR-3B filings
INSERT INTO public.gstr3b_filings (user_id, filing_period, status, tax_payable, tax_paid, filed_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  to_char(date_trunc('month', now()) - (interval '1 month' * gs), 'YYYY-MM'),
  CASE WHEN gs <= 2 THEN 'filed' ELSE 'pending' END,
  125000 + (gs * 5000),
  CASE WHEN gs <= 2 THEN 125000 + (gs * 5000) ELSE NULL END,
  CASE WHEN gs <= 2 THEN now() - (interval '20 days' * gs) ELSE NULL END
FROM generate_series(0, 5) AS gs
ON CONFLICT (user_id, filing_period) DO UPDATE SET
  status = EXCLUDED.status,
  tax_payable = EXCLUDED.tax_payable,
  tax_paid = EXCLUDED.tax_paid,
  filed_at = EXCLUDED.filed_at;

-- Seed ITC reconciliation data
INSERT INTO public.itc_reconciliation (
  user_id,
  invoice_number,
  supplier_name,
  invoice_date,
  taxable_value,
  tax_amount,
  matching_status,
  mismatch_reason
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  concat('INV-', 1000 + gs),
  CASE WHEN gs % 2 = 0 THEN 'Acme Suppliers' ELSE 'Bright Traders' END,
  (current_date - (gs * 5))::date,
  50000 + (gs * 7500),
  9000 + (gs * 1200),
  CASE WHEN gs % 3 = 0 THEN 'mismatch' ELSE 'matched' END,
  CASE WHEN gs % 3 = 0 THEN 'Invoice not in GSTR-2A' ELSE NULL END
FROM generate_series(0, 12) AS gs
ON CONFLICT (user_id, invoice_number) DO UPDATE SET
  supplier_name = EXCLUDED.supplier_name,
  invoice_date = EXCLUDED.invoice_date,
  taxable_value = EXCLUDED.taxable_value,
  tax_amount = EXCLUDED.tax_amount,
  matching_status = EXCLUDED.matching_status,
  mismatch_reason = EXCLUDED.mismatch_reason;

-- Seed GST mismatch alerts
INSERT INTO public.gst_mismatch_alerts (
  user_id,
  invoice_number,
  counterparty,
  amount,
  severity,
  alert_type,
  message,
  is_resolved
)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'INV-1012', 'Acme Suppliers', 67250, 'high', 'missing_invoice', 'Invoice missing in GSTR-2B for May 2024', false),
  ('00000000-0000-0000-0000-000000000001', 'INV-1008', 'Bright Traders', 84320, 'medium', 'tax_mismatch', 'Tax paid in 3B lower than 2A by ₹2,150', false),
  ('00000000-0000-0000-0000-000000000001', 'INV-1003', 'SupplyCo', 43210, 'low', 'pending_followup', 'Awaiting supplier response on credit note', true)
ON CONFLICT (user_id, invoice_number) DO UPDATE SET
  counterparty = EXCLUDED.counterparty,
  amount = EXCLUDED.amount,
  severity = EXCLUDED.severity,
  alert_type = EXCLUDED.alert_type,
  message = EXCLUDED.message,
  is_resolved = EXCLUDED.is_resolved;

-- Seed payment transactions table if present
DO $$ BEGIN
  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    INSERT INTO public.payment_transactions (user_id, status, processed, amount, reference_id)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'verified', false, 149900, 'RAZORPAY-DEMO-1'),
      ('00000000-0000-0000-0000-000000000001', 'pending', false, 149900, 'RAZORPAY-DEMO-2')
    ON CONFLICT (reference_id) DO NOTHING;
  END IF;
END $$;
