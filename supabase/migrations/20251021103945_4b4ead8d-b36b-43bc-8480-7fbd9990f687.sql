-- Add supplier_id and supplier_snapshot to purchase_orders if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='supplier_id') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN supplier_id uuid REFERENCES public.customers(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='supplier_snapshot') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN supplier_snapshot jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='status') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN status text DEFAULT 'unpaid';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_orders' AND column_name='order_date') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN order_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Add type column to customers table to distinguish suppliers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='type') THEN
    ALTER TABLE public.customers ADD COLUMN type text DEFAULT 'customer';
  END IF;
END $$;

-- Create purchase_orders RLS policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
    AND tablename='purchase_orders' 
    AND policyname='purchase_orders_owner_rw'
  ) THEN
    CREATE POLICY purchase_orders_owner_rw ON public.purchase_orders
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;