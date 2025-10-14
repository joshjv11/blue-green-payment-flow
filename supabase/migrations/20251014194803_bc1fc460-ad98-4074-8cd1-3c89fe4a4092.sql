-- ============================================
-- InvoiceFlow: Database Sync & RLS Setup
-- ============================================

-- 1. Ensure user_id columns exist on all key tables
-- inventory_txns: Add user_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'inventory_txns' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.inventory_txns ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Backfill user_id from products table
    UPDATE public.inventory_txns it
    SET user_id = p.user_id
    FROM public.products p
    WHERE it.product_id = p.id
      AND it.user_id IS NULL;
      
    -- Make user_id NOT NULL after backfill
    ALTER TABLE public.inventory_txns ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 2. Enable RLS on all key tables (idempotent)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can manage their own products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

DROP POLICY IF EXISTS "Users can manage their own inventory transactions" ON public.inventory_txns;
DROP POLICY IF EXISTS "Users can view their product transactions" ON public.inventory_txns;
DROP POLICY IF EXISTS "Users can insert transactions for their products" ON public.inventory_txns;

DROP POLICY IF EXISTS "Users can manage their own export logs" ON public.export_logs;
DROP POLICY IF EXISTS "Users can view their own export logs" ON public.export_logs;
DROP POLICY IF EXISTS "Users can insert their own export logs" ON public.export_logs;

DROP POLICY IF EXISTS "Users can manage their own user plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can view their own user plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own user plan" ON public.user_plans;

DROP POLICY IF EXISTS "Users can manage their own business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can view their own business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can insert their own business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can update their own business settings" ON public.business_settings;

-- 4. Create comprehensive per-user policies
-- Products
CREATE POLICY "Users can view their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- Inventory Transactions
CREATE POLICY "Users can view their own inventory transactions"
  ON public.inventory_txns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory transactions"
  ON public.inventory_txns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory transactions"
  ON public.inventory_txns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory transactions"
  ON public.inventory_txns FOR DELETE
  USING (auth.uid() = user_id);

-- Export Logs
CREATE POLICY "Users can view their own export logs"
  ON public.export_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export logs"
  ON public.export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User Plans
CREATE POLICY "Users can view their own user plan"
  ON public.user_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user plan"
  ON public.user_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own user plan"
  ON public.user_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all plans
CREATE POLICY "Admins can view all user plans"
  ON public.user_plans FOR SELECT
  USING (public.is_system_admin());

-- Admins can update all plans
CREATE POLICY "Admins can update all user plans"
  ON public.user_plans FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Business Settings
CREATE POLICY "Users can view their own business settings"
  ON public.business_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business settings"
  ON public.business_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business settings"
  ON public.business_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business settings"
  ON public.business_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create or replace user_plan_view with security invoker
DROP VIEW IF EXISTS public.user_plan_view;

CREATE VIEW public.user_plan_view
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  COALESCE(plan, 'free') as plan,
  COALESCE(ai_queries_limit - ai_queries_used, 0) as credits_remaining,
  expires_at as valid_until,
  is_active,
  ai_queries_used,
  ai_queries_limit
FROM public.user_plans
WHERE user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON public.user_plan_view TO authenticated;

-- 6. Create helper function to get user's current plan (security definer)
CREATE OR REPLACE FUNCTION public.get_user_plan()
RETURNS TABLE (
  plan text,
  is_active boolean,
  credits_remaining integer,
  valid_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(up.plan, 'free') as plan,
    COALESCE(up.is_active, true) as is_active,
    COALESCE(up.ai_queries_limit - up.ai_queries_used, 0) as credits_remaining,
    up.expires_at as valid_until
  FROM public.user_plans up
  WHERE up.user_id = auth.uid()
  LIMIT 1;
$$;

-- 7. Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_txns_user_id ON public.inventory_txns(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON public.export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON public.business_settings(user_id);

-- 8. Ensure proper FK constraints
DO $$
BEGIN
  -- inventory_txns -> products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_txns_product_id_fkey'
      AND table_name = 'inventory_txns'
  ) THEN
    ALTER TABLE public.inventory_txns 
      ADD CONSTRAINT inventory_txns_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;