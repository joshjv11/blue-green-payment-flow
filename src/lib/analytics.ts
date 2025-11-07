// Export types for analytics components
export interface DashboardSummary {
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  net_profit: number;
}

export interface InventoryValue {
  total_inventory_value: number;
  sku_count: number;
}

export interface MonthlyAggregate {
  tx_month: string;
  sales_total: number;
  purchases_total: number;
  expenses_total: number;
}

export interface TopCustomer {
  customer_id?: string;
  customer_name: string;
  total_sales?: number;
  total_amount?: number;
  transaction_count?: number;
  invoice_count?: number;
}

export interface TopVendor {
  vendor_id?: string;
  vendor_name: string;
  total_purchases?: number;
  total_amount?: number;
  transaction_count?: number;
  bill_count?: number;
}

export interface UpcomingBill {
  id: string;
  name?: string;
  bill_name?: string;
  description?: string;
  amount: number;
  due_date: string;
  category?: string;
  status?: string;
}

/**
 * Feature usage tracking - DISABLED
 * Requires user_feature_usage table
 */
export async function trackFeatureUsage(
  _featureName: string,
  _actionType: 'view' | 'click' | 'submit' | 'export' | 'create' | 'send' = 'view',
  _metadata?: Record<string, any>
) {
  // Disabled - requires database migration
  return Promise.resolve();
}

/**
 * Batch feature usage tracking - DISABLED
 */
export async function trackFeatureUsageBatch(
  _events: Array<{
    featureName: string;
    actionType?: 'view' | 'click' | 'submit' | 'export' | 'create' | 'send';
    metadata?: Record<string, any>;
  }>
) {
  // Disabled - requires database migration
  return Promise.resolve();
}
