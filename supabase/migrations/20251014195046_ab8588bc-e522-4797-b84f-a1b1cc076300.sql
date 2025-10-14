-- ============================================
-- InvoiceFlow: Database Sync & RLS Setup (Fixed)
-- ============================================

-- 1. Drop ALL existing policies comprehensively
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on target tables
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'products', 'inventory_txns', 'export_logs', 
        'user_plans', 'business_settings'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2. Ensure user_id column on inventory_txns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'inventory_txns' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.inventory_txns ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Backfill from products
    UPDATE public.inventory_txns it
    SET user_id = p.user_id
    FROM public.products p
    WHERE it.product_id = p.id AND it.user_id IS NULL;
      
    ALTER TABLE public.inventory_txns ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 3. Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create per-user RLS policies

-- Products policies
CREATE POLICY "users_select_own_products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- Inventory transactions policies
CREATE POLICY "users_select_own_inventory_txns"
  ON public.inventory_txns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_inventory_txns"
  ON public.inventory_txns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_inventory_txns"
  ON public.inventory_txns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_inventory_txns"
  ON public.inventory_txns FOR DELETE
  USING (auth.uid() = user_id);

-- Export logs policies
CREATE POLICY "users_select_own_export_logs"
  ON public.export_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_export_logs"
  ON public.export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User plans policies
CREATE POLICY "users_select_own_plan"
  ON public.user_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_plan"
  ON public.user_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_plan"
  ON public.user_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_select_all_plans"
  ON public.user_plans FOR SELECT
  USING (public.is_system_admin());

CREATE POLICY "admins_update_all_plans"
  ON public.user_plans FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Business settings policies
CREATE POLICY "users_select_own_business_settings"
  ON public.business_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_business_settings"
  ON public.business_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_business_settings"
  ON public.business_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_business_settings"
  ON public.business_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create user_plan_view with security_invoker
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

GRANT SELECT ON public.user_plan_view TO authenticated;

-- 6. Create helper function
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

-- 7. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_inventory_txns_user_id ON public.inventory_txns(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON public.export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON public.business_settings(user_id);