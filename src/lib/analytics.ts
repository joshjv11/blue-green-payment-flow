import { supabase } from './supabase';

export interface DashboardSummary {
  user_id: string;
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  net_profit: number;
}

export interface MonthlyAggregate {
  user_id: string;
  tx_month: string;
  sales_total: number;
  purchases_total: number;
  expenses_total: number;
}

export interface TopCustomer {
  user_id: string;
  customer_name: string;
  total_amount: number;
  invoice_count: number;
}

export interface TopVendor {
  user_id: string;
  vendor_name: string;
  total_amount: number;
  bill_count: number;
}

export interface UpcomingBill {
  user_id: string;
  id: string;
  bill_name: string;
  amount: number;
  due_date: string;
  status: string;
}

export interface InventoryValue {
  user_id: string;
  total_inventory_value: number;
  sku_count: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  const { data, error } = await supabase
    .from('dashboard_summary_v1')
    .select('*')
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function getMonthlyAggregates(): Promise<MonthlyAggregate[]> {
  const { data, error } = await supabase
    .from('monthly_aggregates_v1')
    .select('*')
    .order('tx_month', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getTopCustomers(limit = 5): Promise<TopCustomer[]> {
  const { data, error } = await supabase
    .from('top_customers_v1')
    .select('*')
    .order('total_amount', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function getTopVendors(limit = 5): Promise<TopVendor[]> {
  const { data, error } = await supabase
    .from('top_vendors_v1')
    .select('*')
    .order('total_amount', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function getUpcomingBills(limit = 10): Promise<UpcomingBill[]> {
  const { data, error } = await supabase
    .from('upcoming_bills_v1')
    .select('*')
    .order('due_date', { ascending: true })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function getInventoryValue(): Promise<InventoryValue | null> {
  const { data, error } = await supabase
    .from('inventory_value_v1')
    .select('*')
    .maybeSingle();
  
  if (error) throw error;
  return data;
}
