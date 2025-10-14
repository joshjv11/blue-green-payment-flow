-- Drop and recreate GST summary view without SECURITY DEFINER
DROP VIEW IF EXISTS public.gst_summary;

CREATE VIEW public.gst_summary 
WITH (security_invoker = true) AS
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