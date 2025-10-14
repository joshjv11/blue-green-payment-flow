-- Add international tax and FX columns to sales_orders
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS fx_currency text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fx_rate_to_base numeric DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS tax_regime text DEFAULT 'IND_GST';

-- Add international tax and FX columns to purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS fx_currency text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fx_rate_to_base numeric DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS tax_regime text DEFAULT 'IND_GST';

-- Add zero-rated and reverse charge flags to order_lines
ALTER TABLE public.order_lines
ADD COLUMN IF NOT EXISTS zero_rated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rcm boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.sales_orders.fx_currency IS 'Invoice currency (ISO-3 code), NULL means base currency';
COMMENT ON COLUMN public.sales_orders.fx_rate_to_base IS 'Exchange rate from FX currency to base currency';
COMMENT ON COLUMN public.sales_orders.tax_regime IS 'Tax regime: IND_GST, UAE_VAT, GENERIC_VAT, NO_TAX';
COMMENT ON COLUMN public.purchase_orders.fx_currency IS 'Invoice currency (ISO-3 code), NULL means base currency';
COMMENT ON COLUMN public.purchase_orders.fx_rate_to_base IS 'Exchange rate from FX currency to base currency';
COMMENT ON COLUMN public.purchase_orders.tax_regime IS 'Tax regime: IND_GST, UAE_VAT, GENERIC_VAT, NO_TAX';
COMMENT ON COLUMN public.order_lines.zero_rated IS 'Zero-rated supply (0% tax but taxable)';
COMMENT ON COLUMN public.order_lines.rcm IS 'Reverse Charge Mechanism - tax not added to invoice total';