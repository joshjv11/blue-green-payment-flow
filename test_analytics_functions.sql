-- Test Analytics Functions
-- Run these queries to verify everything is working

-- Test Sales KPIs (last 30 days)
SELECT * FROM public.get_sales_kpis(
  (CURRENT_DATE - INTERVAL '30 days')::date,
  CURRENT_DATE::date
);

-- Test Purchases KPIs (last 30 days)
SELECT * FROM public.get_purchases_kpis(
  (CURRENT_DATE - INTERVAL '30 days')::date,
  CURRENT_DATE::date
);

-- Test Sales Trends (last 7 days)
SELECT * FROM public.get_sales_trends(
  (CURRENT_DATE - INTERVAL '7 days')::date,
  CURRENT_DATE::date
);

-- Test Purchases Trends (last 7 days)
SELECT * FROM public.get_purchases_trends(
  (CURRENT_DATE - INTERVAL '7 days')::date,
  CURRENT_DATE::date
);

-- Test Inventory KPIs
SELECT * FROM public.get_inventory_kpis();

-- Test Stock Turnover (last 30 days)
SELECT * FROM public.get_stock_turnover(
  (CURRENT_DATE - INTERVAL '30 days')::date,
  CURRENT_DATE::date
);

-- Test Reorder Suggestions
SELECT * FROM public.get_reorder_suggestions();

-- Test Profitability by SKU (last 3 months)
SELECT * FROM public.get_profitability_by_sku(
  (CURRENT_DATE - INTERVAL '3 months')::date,
  CURRENT_DATE::date,
  10,  -- limit
  0    -- offset
);

