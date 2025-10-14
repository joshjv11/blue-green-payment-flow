-- Add company information to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_gstin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_pan TEXT;

-- Add GST fields to sales_orders
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_gstin TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_state TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS place_of_supply TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS is_igst BOOLEAN DEFAULT false;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;

-- Add GST fields to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_gstin TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_address TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_state TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS place_of_supply TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS is_igst BOOLEAN DEFAULT false;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;

-- Add HSN/SAC and GST breakdown to order_lines
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS hsn_sac_code TEXT;
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 0;
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;
ALTER TABLE public.order_lines ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC DEFAULT 0;

-- Create GST summary view for reporting
CREATE OR REPLACE VIEW public.gst_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) as month,
  'Sales' as transaction_type,
  SUM(cgst_amount) as total_cgst,
  SUM(sgst_amount) as total_sgst,
  SUM(igst_amount) as total_igst,
  SUM(tax_amount) as total_tax,
  SUM(grand_total) as total_amount
FROM public.sales_orders
GROUP BY user_id, DATE_TRUNC('month', transaction_date)

UNION ALL

SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) as month,
  'Purchases' as transaction_type,
  SUM(cgst_amount) as total_cgst,
  SUM(sgst_amount) as total_sgst,
  SUM(igst_amount) as total_igst,
  SUM(tax_amount) as total_tax,
  SUM(grand_total) as total_amount
FROM public.purchase_orders
GROUP BY user_id, DATE_TRUNC('month', transaction_date);

-- Function to calculate GST breakdown
CREATE OR REPLACE FUNCTION public.calculate_gst_breakdown(
  p_taxable_amount NUMERIC,
  p_gst_rate NUMERIC,
  p_is_igst BOOLEAN
)
RETURNS TABLE(cgst NUMERIC, sgst NUMERIC, igst NUMERIC) AS $$
DECLARE
  v_total_gst NUMERIC;
BEGIN
  v_total_gst := (p_taxable_amount * p_gst_rate / 100);
  
  IF p_is_igst THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, v_total_gst;
  ELSE
    RETURN QUERY SELECT v_total_gst / 2, v_total_gst / 2, 0::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;