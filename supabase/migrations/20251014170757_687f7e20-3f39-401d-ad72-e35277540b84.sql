-- Add tax regime and enhanced business details to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT 'IND_GST';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_legal_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_state_code TEXT;

-- Add party details to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS party_gstin TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS party_state TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS party_state_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;

-- Enhance products with HSN/SAC and default GST rate
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_gst_rate NUMERIC DEFAULT 18;

-- Add reverse charge and e-way bill to sales orders
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT false;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS eway_bill_no TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Add reverse charge and e-way bill to purchase orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT false;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS eway_bill_no TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Indian state codes mapping
CREATE TABLE IF NOT EXISTS public.indian_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_name TEXT NOT NULL UNIQUE,
  state_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert Indian states with codes
INSERT INTO public.indian_states (state_name, state_code) VALUES
  ('Andaman and Nicobar Islands', '35'),
  ('Andhra Pradesh', '37'),
  ('Arunachal Pradesh', '12'),
  ('Assam', '18'),
  ('Bihar', '10'),
  ('Chandigarh', '04'),
  ('Chhattisgarh', '22'),
  ('Dadra and Nagar Haveli and Daman and Diu', '26'),
  ('Delhi', '07'),
  ('Goa', '30'),
  ('Gujarat', '24'),
  ('Haryana', '06'),
  ('Himachal Pradesh', '02'),
  ('Jammu and Kashmir', '01'),
  ('Jharkhand', '20'),
  ('Karnataka', '29'),
  ('Kerala', '32'),
  ('Ladakh', '38'),
  ('Lakshadweep', '31'),
  ('Madhya Pradesh', '23'),
  ('Maharashtra', '27'),
  ('Manipur', '14'),
  ('Meghalaya', '17'),
  ('Mizoram', '15'),
  ('Nagaland', '13'),
  ('Odisha', '21'),
  ('Puducherry', '34'),
  ('Punjab', '03'),
  ('Rajasthan', '08'),
  ('Sikkim', '11'),
  ('Tamil Nadu', '33'),
  ('Telangana', '36'),
  ('Tripura', '16'),
  ('Uttar Pradesh', '09'),
  ('Uttarakhand', '05'),
  ('West Bengal', '19')
ON CONFLICT (state_name) DO NOTHING;

-- Function to convert amount to words (Indian format)
CREATE OR REPLACE FUNCTION public.amount_to_words(amount NUMERIC)
RETURNS TEXT AS $$
DECLARE
  ones TEXT[] := ARRAY['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  teens TEXT[] := ARRAY['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  tens TEXT[] := ARRAY['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  rupees BIGINT;
  paise INTEGER;
  result TEXT := '';
  temp BIGINT;
BEGIN
  IF amount = 0 THEN
    RETURN 'Zero Rupees Only';
  END IF;
  
  rupees := FLOOR(amount);
  paise := ROUND((amount - rupees) * 100);
  
  -- Process crores
  IF rupees >= 10000000 THEN
    temp := rupees / 10000000;
    result := result || ones[temp + 1] || ' Crore ';
    rupees := rupees % 10000000;
  END IF;
  
  -- Process lakhs
  IF rupees >= 100000 THEN
    temp := rupees / 100000;
    result := result || ones[temp + 1] || ' Lakh ';
    rupees := rupees % 100000;
  END IF;
  
  -- Process thousands
  IF rupees >= 1000 THEN
    temp := rupees / 1000;
    result := result || ones[temp + 1] || ' Thousand ';
    rupees := rupees % 1000;
  END IF;
  
  -- Process hundreds
  IF rupees >= 100 THEN
    temp := rupees / 100;
    result := result || ones[temp + 1] || ' Hundred ';
    rupees := rupees % 100;
  END IF;
  
  -- Process remaining
  IF rupees >= 20 THEN
    result := result || tens[(rupees / 10)::INTEGER + 1] || ' ';
    rupees := rupees % 10;
  ELSIF rupees >= 10 THEN
    result := result || teens[(rupees - 10)::INTEGER + 1] || ' ';
    rupees := 0;
  END IF;
  
  IF rupees > 0 THEN
    result := result || ones[rupees::INTEGER + 1] || ' ';
  END IF;
  
  result := result || 'Rupees';
  
  IF paise > 0 THEN
    result := result || ' and ' || paise::TEXT || ' Paise';
  END IF;
  
  RETURN result || ' Only';
END;
$$ LANGUAGE plpgsql IMMUTABLE;