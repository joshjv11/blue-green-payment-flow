-- Analytics foundation: facts, dims, and rollups
-- Safe to re-run; uses CREATE IF NOT EXISTS where possible

-- Date dimension (lightweight)
CREATE TABLE IF NOT EXISTS public.dim_dates (
  d date PRIMARY KEY,
  year int,
  month int,
  day int,
  dow int,
  month_name text
);

-- Populate next 3 years if empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dim_dates) THEN
    INSERT INTO public.dim_dates (d, year, month, day, dow, month_name)
    SELECT d::date,
           EXTRACT(YEAR FROM d)::int,
           EXTRACT(MONTH FROM d)::int,
           EXTRACT(DAY FROM d)::int,
           EXTRACT(DOW FROM d)::int,
           TO_CHAR(d, 'Mon')
    FROM generate_series(date_trunc('year', now()) - interval '365 days',
                         date_trunc('year', now()) + interval '2 years',
                         interval '1 day') d;
  END IF;
END $$;

-- Ensure required tables exist and columns are correct
DO $$
BEGIN
  -- Check if sales_orders table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sales_orders'
  ) THEN
    RAISE EXCEPTION 'Table sales_orders does not exist. Please run the base migrations first.';
  END IF;

  -- Check if order_lines table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_lines'
  ) THEN
    RAISE EXCEPTION 'Table order_lines does not exist. Please run the base migrations first.';
  END IF;

  -- Ensure payment_status column exists in sales_orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.sales_orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
  END IF;
  
  -- Ensure payment_status column exists in purchase_orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
  END IF;

  -- Ensure product_name column exists, or create it if product_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_lines' 
    AND column_name = 'product_name'
  ) THEN
    -- If product_id exists, we can populate product_name from products table
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_lines' 
      AND column_name = 'product_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'products'
    ) THEN
      -- Add product_name column and populate it
      ALTER TABLE public.order_lines ADD COLUMN product_name TEXT;
      UPDATE public.order_lines ol
      SET product_name = p.name
      FROM public.products p
      WHERE ol.product_id = p.id AND ol.product_name IS NULL;
    ELSE
      -- Neither product_name nor product_id exists, add product_name as nullable
      ALTER TABLE public.order_lines ADD COLUMN product_name TEXT;
    END IF;
  END IF;
END $$;

-- Denormalized facts
-- Create view with conditional columns based on what exists
DO $$
DECLARE
  v_has_product_id BOOLEAN;
  v_has_unit_price BOOLEAN;
  v_has_tax_rate BOOLEAN;
  v_has_subtotal BOOLEAN;
  v_has_total_amount BOOLEAN;
  v_sql TEXT;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'product_id'
  ) INTO v_has_product_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'unit_price'
  ) INTO v_has_unit_price;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'tax_rate'
  ) INTO v_has_tax_rate;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'subtotal'
  ) INTO v_has_subtotal;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'total_amount'
  ) INTO v_has_total_amount;

  -- Build SQL dynamically based on what columns exist
  v_sql := 'CREATE OR REPLACE VIEW public.fact_sales AS
    SELECT so.user_id,
           so.id            AS sales_order_id,
           so.transaction_date::date AS d,
           so.customer_name,
           so.invoice_number,
           so.total_amount,
           so.tax_amount,
           so.grand_total,
           so.payment_status,';
  
  -- Product name
  IF v_has_product_id THEN
    v_sql := v_sql || ' COALESCE(ol.product_name, p.name, ''Unknown Product'') AS product_name,';
  ELSE
    v_sql := v_sql || ' COALESCE(ol.product_name, ''Unknown Product'') AS product_name,';
  END IF;
  
  -- Other columns with defaults if missing
  v_sql := v_sql || ' ol.quantity,';
  v_sql := v_sql || CASE WHEN v_has_unit_price THEN ' ol.unit_price,' ELSE ' 0 AS unit_price,' END;
  v_sql := v_sql || CASE WHEN v_has_tax_rate THEN ' ol.tax_rate,' ELSE ' 0 AS tax_rate,' END;
  
  -- Handle subtotal
  IF v_has_subtotal THEN
    v_sql := v_sql || ' ol.subtotal,';
  ELSIF v_has_total_amount THEN
    v_sql := v_sql || ' ol.total_amount AS subtotal,';
  ELSE
    v_sql := v_sql || ' 0 AS subtotal,';
  END IF;
  
  -- Handle line_total
  IF v_has_total_amount THEN
    v_sql := v_sql || ' ol.total_amount AS line_total';
  ELSE
    v_sql := v_sql || ' 0 AS line_total';
  END IF;
  
  v_sql := v_sql || '
    FROM public.sales_orders so
    LEFT JOIN public.order_lines ol
      ON ol.order_id = so.id AND ol.order_type = ''sale''';
  
  IF v_has_product_id THEN
    v_sql := v_sql || ' LEFT JOIN public.products p ON ol.product_id = p.id';
  END IF;
  
  EXECUTE v_sql;
END $$;

-- Create purchase view with conditional columns
DO $$
DECLARE
  v_has_product_id BOOLEAN;
  v_has_unit_price BOOLEAN;
  v_has_tax_rate BOOLEAN;
  v_has_subtotal BOOLEAN;
  v_has_total_amount BOOLEAN;
  v_has_supplier_name BOOLEAN;
  v_sql TEXT;
BEGIN
  -- Check which columns exist in order_lines
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'product_id'
  ) INTO v_has_product_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'unit_price'
  ) INTO v_has_unit_price;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'tax_rate'
  ) INTO v_has_tax_rate;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'subtotal'
  ) INTO v_has_subtotal;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'total_amount'
  ) INTO v_has_total_amount;

  -- Check columns in purchase_orders table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'supplier_name'
  ) INTO v_has_supplier_name;

  -- Build SQL dynamically
  v_sql := 'CREATE OR REPLACE VIEW public.fact_purchases AS
    SELECT po.user_id,
           po.id            AS purchase_order_id,
           po.transaction_date::date AS d,';
  
  -- Handle supplier_name
  IF v_has_supplier_name THEN
    v_sql := v_sql || ' po.supplier_name,';
  ELSE
    v_sql := v_sql || ' ''Unknown Supplier'' AS supplier_name,';
  END IF;
  
  v_sql := v_sql || ' po.invoice_number,
           po.total_amount,
           po.tax_amount,
           po.grand_total,
           po.payment_status,';
  
  -- Product name
  IF v_has_product_id THEN
    v_sql := v_sql || ' COALESCE(ol.product_name, p.name, ''Unknown Product'') AS product_name,';
  ELSE
    v_sql := v_sql || ' COALESCE(ol.product_name, ''Unknown Product'') AS product_name,';
  END IF;
  
  -- Other columns with defaults if missing
  v_sql := v_sql || ' ol.quantity,';
  v_sql := v_sql || CASE WHEN v_has_unit_price THEN ' ol.unit_price,' ELSE ' 0 AS unit_price,' END;
  v_sql := v_sql || CASE WHEN v_has_tax_rate THEN ' ol.tax_rate,' ELSE ' 0 AS tax_rate,' END;
  
  -- Handle subtotal
  IF v_has_subtotal THEN
    v_sql := v_sql || ' ol.subtotal,';
  ELSIF v_has_total_amount THEN
    v_sql := v_sql || ' ol.total_amount AS subtotal,';
  ELSE
    v_sql := v_sql || ' 0 AS subtotal,';
  END IF;
  
  -- Handle line_total
  IF v_has_total_amount THEN
    v_sql := v_sql || ' ol.total_amount AS line_total';
  ELSE
    v_sql := v_sql || ' 0 AS line_total';
  END IF;
  
  v_sql := v_sql || '
    FROM public.purchase_orders po
    LEFT JOIN public.order_lines ol
      ON ol.order_id = po.id AND ol.order_type = ''purchase''';
  
  IF v_has_product_id THEN
    v_sql := v_sql || ' LEFT JOIN public.products p ON ol.product_id = p.id';
  END IF;
  
  EXECUTE v_sql;
END $$;

-- Simple movements view (for turnover/valuation calculations later)
-- Only create if inventory tables exist
DROP VIEW IF EXISTS public.fact_inventory_movements;

DO $$
DECLARE
  v_has_reference_type BOOLEAN;
  v_has_created_at BOOLEAN;
  v_sql TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inventory_txns'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    -- Check if columns exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'inventory_txns' AND column_name = 'reference_type'
    ) INTO v_has_reference_type;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'inventory_txns' AND column_name = 'created_at'
    ) INTO v_has_created_at;
    
    -- Build SQL dynamically
    v_sql := 'CREATE VIEW public.fact_inventory_movements AS
      SELECT it.id,
             p.user_id,
             it.product_id,
             it.txn_type,
             it.quantity,';
    
    IF v_has_reference_type THEN
      v_sql := v_sql || ' it.reference_type,';
    ELSE
      v_sql := v_sql || ' NULL AS reference_type,';
    END IF;
    
    -- Handle created_at
    IF v_has_created_at THEN
      v_sql := v_sql || ' it.created_at::date AS d';
    ELSE
      v_sql := v_sql || ' CURRENT_DATE AS d';
    END IF;
    
    v_sql := v_sql || '
      FROM public.inventory_txns it
      JOIN public.products p ON p.id = it.product_id';
    
    EXECUTE v_sql;
  END IF;
END $$;

-- Rollups (materialized) for performance
-- Drop existing if exists to recreate with correct structure
DROP MATERIALIZED VIEW IF EXISTS public.mv_sales_daily;

CREATE MATERIALIZED VIEW public.mv_sales_daily AS
SELECT user_id,
       d,
       COUNT(DISTINCT sales_order_id) AS orders,
       SUM(grand_total)              AS sales_amount,
       SUM(tax_amount)               AS tax_amount
FROM (
  SELECT DISTINCT user_id, sales_order_id, d, grand_total, tax_amount
  FROM public.fact_sales
) t
GROUP BY user_id, d;

CREATE UNIQUE INDEX IF NOT EXISTS mv_sales_daily_user_date ON public.mv_sales_daily(user_id, d);

-- Drop existing if exists to recreate with correct structure
DROP MATERIALIZED VIEW IF EXISTS public.mv_purchases_daily;

CREATE MATERIALIZED VIEW public.mv_purchases_daily AS
SELECT user_id,
       d,
       COUNT(DISTINCT purchase_order_id) AS bills,
       SUM(grand_total)                  AS spend_amount,
       SUM(tax_amount)                   AS tax_amount
FROM (
  SELECT DISTINCT user_id, purchase_order_id, d, grand_total, tax_amount
  FROM public.fact_purchases
) t
GROUP BY user_id, d;

CREATE UNIQUE INDEX IF NOT EXISTS mv_purchases_daily_user_date ON public.mv_purchases_daily(user_id, d);

-- Profitability by SKU (monthly) – simplistic gross margin view
-- Drop existing if exists to recreate with correct structure
DROP MATERIALIZED VIEW IF EXISTS public.mv_profitability_by_sku_monthly;

CREATE MATERIALIZED VIEW public.mv_profitability_by_sku_monthly AS
WITH sales AS (
  SELECT user_id,
         product_name,
         date_trunc('month', d) AS m,
         SUM(line_total)        AS revenue,
         SUM(quantity)          AS qty
  FROM public.fact_sales
  GROUP BY 1,2,3
),
avg_purchase AS (
  SELECT user_id,
         product_name,
         date_trunc('month', d) AS m,
         NULLIF(SUM(line_total),0) / NULLIF(SUM(quantity),0) AS avg_cost
  FROM public.fact_purchases
  GROUP BY 1,2,3
)
SELECT s.user_id,
       s.product_name,
       s.m,
       s.qty,
       s.revenue,
       COALESCE(a.avg_cost, 0)              AS avg_cost,
       GREATEST(s.revenue - COALESCE(a.avg_cost,0)*s.qty, 0) AS gross_margin
FROM sales s
LEFT JOIN avg_purchase a
  ON a.user_id = s.user_id AND a.product_name = s.product_name AND a.m = s.m;

CREATE UNIQUE INDEX IF NOT EXISTS mv_profitability_by_sku_monthly_user_product_month 
ON public.mv_profitability_by_sku_monthly(user_id, product_name, m);

-- Refresh helper
CREATE OR REPLACE FUNCTION public.refresh_analytics_rollups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sales_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_purchases_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_profitability_by_sku_monthly;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_analytics_rollups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_rollups() TO service_role, authenticated;


