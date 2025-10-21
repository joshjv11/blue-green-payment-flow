-- Enable RLS on customers and sales_orders if not already enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Create customers policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='customers' 
    AND policyname='customers_owner_rw'
  ) THEN
    CREATE POLICY customers_owner_rw ON public.customers
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Create sales_orders policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='sales_orders' 
    AND policyname='sales_orders_owner_rw'
  ) THEN
    CREATE POLICY sales_orders_owner_rw ON public.sales_orders
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;