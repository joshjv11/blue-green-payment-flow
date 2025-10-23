-- Analytics views for premium dashboard
-- Note: Using actual column names from schema (transaction_date, not order_date)

-- 1. Unified transactions (sales, purchases, expenses)
create or replace view public.unified_transactions_v1 as
  select user_id,
         'sales'::text as kind,
         transaction_date as tx_date,
         date_trunc('month', transaction_date)::date as tx_month,
         grand_total::numeric(12,2) as amount,
         id as ref_id
  from public.sales_orders
  union all
  select user_id,
         'purchases'::text as kind,
         transaction_date as tx_date,
         date_trunc('month', transaction_date)::date as tx_month,
         grand_total::numeric(12,2) as amount,
         id as ref_id
  from public.purchase_orders
  union all
  select user_id,
         'expenses'::text as kind,
         date as tx_date,
         date_trunc('month', date)::date as tx_month,
         amount::numeric(12,2) as amount,
         id as ref_id
  from public.expenses;

-- 2. Dashboard summary (totals + net profit)
create or replace view public.dashboard_summary_v1 as
  with t as (
    select user_id, kind, coalesce(amount,0) as amount
    from public.unified_transactions_v1
  )
  select
    user_id,
    sum(case when kind='sales' then amount else 0 end)::numeric(14,2) as total_sales,
    sum(case when kind='purchases' then amount else 0 end)::numeric(14,2) as total_purchases,
    sum(case when kind='expenses' then amount else 0 end)::numeric(14,2) as total_expenses,
    ( sum(case when kind='sales' then amount else 0 end)
    - sum(case when kind='purchases' then amount else 0 end)
    - sum(case when kind='expenses' then amount else 0 end)
    )::numeric(14,2) as net_profit
  from t group by user_id;

-- 3. Monthly aggregates (for charts)
create or replace view public.monthly_aggregates_v1 as
  select
    user_id,
    tx_month,
    sum(case when kind='sales' then amount else 0 end)::numeric(14,2) as sales_total,
    sum(case when kind='purchases' then amount else 0 end)::numeric(14,2) as purchases_total,
    sum(case when kind='expenses' then amount else 0 end)::numeric(14,2) as expenses_total
  from public.unified_transactions_v1
  group by user_id, tx_month
  order by user_id, tx_month;

-- 4. Top customers (by sales amount, last 90 days)
create or replace view public.top_customers_v1 as
  select
    so.user_id,
    so.customer_name,
    sum(so.grand_total)::numeric(14,2) as total_amount,
    count(*) as invoice_count
  from public.sales_orders so
  where so.transaction_date >= current_date - interval '90 days'
  group by so.user_id, so.customer_name
  order by total_amount desc;

-- 5. Top vendors (by purchase amount, last 90 days)
create or replace view public.top_vendors_v1 as
  select
    po.user_id,
    po.supplier_name as vendor_name,
    sum(po.grand_total)::numeric(14,2) as total_amount,
    count(*) as bill_count
  from public.purchase_orders po
  where po.transaction_date >= current_date - interval '90 days'
  group by po.user_id, po.supplier_name
  order by total_amount desc;

-- 6. Upcoming due bills (next 30 days, unpaid)
create or replace view public.upcoming_bills_v1 as
  select
    b.user_id,
    b.id,
    b.name as bill_name,
    b.amount::numeric(12,2) as amount,
    b.due_date::date as due_date,
    b.status
  from public.bills b
  where b.status = 'unpaid'
    and b.due_date between current_date and current_date + interval '30 days'
  order by b.due_date asc;

-- 7. Inventory value (from products table)
create or replace view public.inventory_value_v1 as
  select
    p.user_id,
    sum(coalesce(p.stock_qty,0) * coalesce(p.purchase_price,0))::numeric(14,2) as total_inventory_value,
    count(*) as sku_count
  from public.products p
  group by p.user_id;

-- Make views run with invoker rights
alter view public.unified_transactions_v1 set (security_invoker = true);
alter view public.dashboard_summary_v1 set (security_invoker = true);
alter view public.monthly_aggregates_v1 set (security_invoker = true);
alter view public.top_customers_v1 set (security_invoker = true);
alter view public.top_vendors_v1 set (security_invoker = true);
alter view public.upcoming_bills_v1 set (security_invoker = true);
alter view public.inventory_value_v1 set (security_invoker = true);

-- Grant select to authenticated users
grant select on public.unified_transactions_v1 to authenticated;
grant select on public.dashboard_summary_v1 to authenticated;
grant select on public.monthly_aggregates_v1 to authenticated;
grant select on public.top_customers_v1 to authenticated;
grant select on public.top_vendors_v1 to authenticated;
grant select on public.upcoming_bills_v1 to authenticated;
grant select on public.inventory_value_v1 to authenticated;