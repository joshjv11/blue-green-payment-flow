-- Refresh Materialized Views
-- Run this to populate initial data in the materialized views
-- This is optional but recommended after first setup

SELECT public.refresh_analytics_rollups();

-- Or refresh manually:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sales_daily;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_purchases_daily;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_profitability_by_sku_monthly;

