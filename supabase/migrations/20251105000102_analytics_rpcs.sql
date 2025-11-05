-- User-scoped RPCs for analytics
-- IMPORTANT: This migration requires fact_sales and fact_purchases views to exist.
-- Run 20251105000101_analytics_views.sql FIRST before running this migration.

-- Verify views exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'fact_sales'
  ) THEN
    RAISE EXCEPTION 'View fact_sales does not exist. Please run 20251105000101_analytics_views.sql FIRST.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'fact_purchases'
  ) THEN
    RAISE EXCEPTION 'View fact_purchases does not exist. Please run 20251105000101_analytics_views.sql FIRST.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_sales_kpis(p_from date, p_to date)
RETURNS TABLE(
  orders int,
  gmv numeric,
  tax numeric,
  avg_order_value numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(DISTINCT sales_order_id)                           AS orders,
    COALESCE(SUM(grand_total),0)                             AS gmv,
    COALESCE(SUM(tax_amount),0)                              AS tax,
    CASE WHEN COUNT(DISTINCT sales_order_id) > 0 
         THEN COALESCE(SUM(grand_total),0) / COUNT(DISTINCT sales_order_id)
         ELSE 0 END                                          AS avg_order_value
  FROM public.fact_sales
  WHERE user_id = auth.uid()
    AND d >= p_from AND d <= p_to;
$$;

CREATE OR REPLACE FUNCTION public.get_purchases_kpis(p_from date, p_to date)
RETURNS TABLE(
  bills int,
  spend numeric,
  tax numeric,
  avg_bill_value numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(DISTINCT purchase_order_id)                        AS bills,
    COALESCE(SUM(grand_total),0)                             AS spend,
    COALESCE(SUM(tax_amount),0)                              AS tax,
    CASE WHEN COUNT(DISTINCT purchase_order_id) > 0
         THEN COALESCE(SUM(grand_total),0) / COUNT(DISTINCT purchase_order_id)
         ELSE 0 END                                          AS avg_bill_value
  FROM public.fact_purchases
  WHERE user_id = auth.uid()
    AND d >= p_from AND d <= p_to;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_trends(p_from date, p_to date)
RETURNS TABLE(
  d date,
  orders int,
  sales_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT d, orders, sales_amount
  FROM public.mv_sales_daily
  WHERE user_id = auth.uid()
    AND d >= p_from AND d <= p_to
  ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.get_purchases_trends(p_from date, p_to date)
RETURNS TABLE(
  d date,
  bills int,
  spend_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT d, bills, spend_amount
  FROM public.mv_purchases_daily
  WHERE user_id = auth.uid()
    AND d >= p_from AND d <= p_to
  ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.get_profitability_by_sku(
  p_from date,
  p_to date,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  product_name text,
  month date,
  qty numeric,
  revenue numeric,
  avg_cost numeric,
  gross_margin numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT product_name,
         m::date AS month,
         qty,
         revenue,
         avg_cost,
         gross_margin
  FROM public.mv_profitability_by_sku_monthly
  WHERE user_id = auth.uid()
    AND m >= date_trunc('month', p_from)
    AND m <= date_trunc('month', p_to)
  ORDER BY gross_margin DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Inventory KPIs
CREATE OR REPLACE FUNCTION public.get_inventory_kpis()
RETURNS TABLE(
  total_skus int,
  total_value numeric,
  low_stock_count int,
  critical_count int,
  avg_turnover_days numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH stock_status AS (
    SELECT 
      p.id,
      p.stock_qty,
      p.reorder_level,
      p.purchase_price * p.stock_qty AS value,
      CASE WHEN p.stock_qty <= p.reorder_level THEN 1 ELSE 0 END AS is_low,
      CASE WHEN p.stock_qty <= (p.reorder_level * 0.5) THEN 1 ELSE 0 END AS is_critical
    FROM public.products p
    WHERE p.user_id = v_user_id
  ),
  turnover AS (
    SELECT 
      AVG(CASE 
        WHEN fs.qty > 0 THEN 30.0 / (fs.qty::numeric / NULLIF(p.stock_qty, 0))
        ELSE NULL
      END) AS avg_days
    FROM public.products p
    LEFT JOIN LATERAL (
      SELECT SUM(quantity) AS qty
      FROM public.fact_sales
      WHERE product_name = p.name
        AND user_id = v_user_id
        AND d >= CURRENT_DATE - INTERVAL '30 days'
    ) fs ON true
    WHERE p.user_id = v_user_id
  )
  SELECT 
    COUNT(*)::int AS total_skus,
    COALESCE(SUM(value), 0) AS total_value,
    SUM(is_low)::int AS low_stock_count,
    SUM(is_critical)::int AS critical_count,
    COALESCE((SELECT avg_days FROM turnover), 0) AS avg_turnover_days
  FROM stock_status;
END;
$$;

-- Stock turnover (simplified: sales qty in last 30 days vs current stock)
CREATE OR REPLACE FUNCTION public.get_stock_turnover(p_from date, p_to date)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  sku text,
  current_stock int,
  sales_qty numeric,
  turnover_ratio numeric,
  days_of_inventory numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH sales_summary AS (
    SELECT 
      fs.product_name,
      SUM(fs.quantity) AS total_qty
    FROM public.fact_sales fs
    WHERE fs.user_id = v_user_id
      AND fs.d >= p_from AND fs.d <= p_to
    GROUP BY fs.product_name
  )
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.stock_qty AS current_stock,
    COALESCE(s.total_qty, 0) AS sales_qty,
    CASE 
      WHEN p.stock_qty > 0 THEN COALESCE(s.total_qty, 0) / p.stock_qty::numeric
      ELSE 0
    END AS turnover_ratio,
    CASE 
      WHEN COALESCE(s.total_qty, 0) > 0 THEN (p.stock_qty::numeric / s.total_qty) * (p_to - p_from)
      ELSE NULL
    END AS days_of_inventory
  FROM public.products p
  LEFT JOIN sales_summary s ON s.product_name = p.name
  WHERE p.user_id = v_user_id
  ORDER BY turnover_ratio DESC NULLS LAST;
END;
$$;

-- Reorder suggestions (simple: daily demand * lead time + safety stock)
CREATE OR REPLACE FUNCTION public.get_reorder_suggestions(p_lead_days int DEFAULT 7, p_service_level numeric DEFAULT 1.65)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  sku text,
  current_stock int,
  reorder_level int,
  avg_daily_demand numeric,
  safety_stock numeric,
  reorder_point numeric,
  suggested_order_qty numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH demand_stats AS (
    SELECT 
      fs.product_name,
      AVG(fs.quantity) AS avg_daily,
      STDDEV(fs.quantity) AS std_daily
    FROM public.fact_sales fs
    WHERE fs.user_id = v_user_id
      AND fs.d >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY fs.product_name
  )
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.stock_qty AS current_stock,
    p.reorder_level,
    COALESCE(d.avg_daily, 0) AS avg_daily_demand,
    GREATEST(COALESCE(d.std_daily * p_service_level, 0), 0) AS safety_stock,
    (COALESCE(d.avg_daily, 0) * p_lead_days) + GREATEST(COALESCE(d.std_daily * p_service_level, 0), 0) AS reorder_point,
    GREATEST(
      (COALESCE(d.avg_daily, 0) * p_lead_days) + GREATEST(COALESCE(d.std_daily * p_service_level, 0), 0) - p.stock_qty,
      0
    ) AS suggested_order_qty
  FROM public.products p
  LEFT JOIN demand_stats d ON d.product_name = p.name
  WHERE p.user_id = v_user_id
    AND p.stock_qty <= COALESCE(
      (COALESCE(d.avg_daily, 0) * p_lead_days) + GREATEST(COALESCE(d.std_daily * p_service_level, 0), 0),
      p.reorder_level
    )
  ORDER BY suggested_order_qty DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_kpis(date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_purchases_kpis(date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_trends(date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_purchases_trends(date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profitability_by_sku(date,date,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inventory_kpis() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stock_turnover(date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_reorder_suggestions(int,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sales_kpis(date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_purchases_kpis(date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sales_trends(date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_purchases_trends(date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_profitability_by_sku(date,date,int,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_inventory_kpis() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_turnover(date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reorder_suggestions(int,numeric) TO authenticated, service_role;


