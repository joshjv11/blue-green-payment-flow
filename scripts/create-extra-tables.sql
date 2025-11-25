-- Auto-generated schema for missing tables

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  tax_id_label TEXT,
  tax_id_value TEXT,
  country TEXT,
  state_or_province TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  state TEXT,
  party_gstin TEXT,
  party_state TEXT,
  party_state_code TEXT,
  type TEXT
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "customers_modify_own" ON public.customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  sku TEXT,
  purchase_price INTEGER,
  selling_price INTEGER,
  stock_qty INTEGER,
  reorder_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_own" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_modify_own" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor TEXT,
  date TEXT,
  amount INTEGER,
  gst INTEGER,
  category TEXT,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_modify_own" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

