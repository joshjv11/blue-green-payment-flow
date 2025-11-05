# Analytics Migrations - Application Instructions

## IMPORTANT: Run Migrations in Order

The analytics system requires **two migrations** to be run in the correct order:

### Step 1: Run Views Migration First
**File:** `supabase/migrations/20251105000101_analytics_views.sql`

This creates:
- `dim_dates` table (date dimension)
- `fact_sales` view
- `fact_purchases` view
- `fact_inventory_movements` view
- Materialized views: `mv_sales_daily`, `mv_purchases_daily`, `mv_profitability_by_sku_monthly`
- `refresh_analytics_rollups()` function

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `20251105000101_analytics_views.sql`
3. Copy and paste the entire file
4. Click "Run" (or press `⌘ + ↵`)
5. Wait for success message

### Step 2: Run RPCs Migration Second
**File:** `supabase/migrations/20251105000102_analytics_rpcs.sql`

This creates:
- `get_sales_kpis()` function
- `get_purchases_kpis()` function
- `get_sales_trends()` function
- `get_purchases_trends()` function
- `get_profitability_by_sku()` function
- `get_inventory_kpis()` function
- `get_stock_turnover()` function
- `get_reorder_suggestions()` function

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `20251105000102_analytics_rpcs.sql`
3. Copy and paste the entire file
4. Click "Run" (or press `⌘ + ↵`)
5. Wait for success message

### Step 3: Refresh Materialized Views (Optional)
After running both migrations, refresh the materialized views to populate initial data:

```sql
SELECT public.refresh_analytics_rollups();
```

Or run it manually:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sales_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_purchases_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_profitability_by_sku_monthly;
```

## Troubleshooting

### Error: "relation fact_sales does not exist"
**Solution:** Run the views migration (`20251105000101_analytics_views.sql`) FIRST before the RPCs migration.

### Error: "column ol.product_name does not exist" or "column payment_status does not exist"
**Solution:** 
1. The migration now checks if required tables and columns exist before creating views.
2. If you see this error, it means:
   - The base migrations haven't been run (e.g., `20251014164920_*` migrations)
   - Or there's a schema mismatch
3. Run the base migrations first, then re-run the views migration.

### Error: "Table sales_orders does not exist" or "Table order_lines does not exist"
**Solution:** You need to run the base migrations that create `sales_orders`, `purchase_orders`, and `order_lines` tables first. These are typically in migrations with names like `20251014164920_*`.

### Error: "materialized view already exists"
**Solution:** The migration now uses `DROP MATERIALIZED VIEW IF EXISTS` before creating, so it's safe to re-run.

## Verification

After running both migrations, verify they work:

```sql
-- Test sales KPIs
SELECT * FROM public.get_sales_kpis(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- Test inventory KPIs
SELECT * FROM public.get_inventory_kpis();

-- Test sales trends
SELECT * FROM public.get_sales_trends(
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE
);
```

If these queries return data (or empty results without errors), the migrations are working correctly!

