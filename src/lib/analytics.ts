import { supabase } from '@/lib/supabase';

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
  customer_name: string;
  total_sales: number;
  transaction_count: number;
}

export interface TopVendor {
  vendor_name: string;
  total_purchases: number;
  transaction_count: number;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: string;
}

// Debounce utility to batch analytics events
let analyticsQueue: Array<() => Promise<void>> = [];
let debounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_DELAY = 2000; // 2 seconds

const flushAnalyticsQueue = async () => {
  if (analyticsQueue.length === 0) return;

  const queue = [...analyticsQueue];
  analyticsQueue = [];
  debounceTimer = null;

  // Execute all queued analytics calls
  await Promise.allSettled(queue.map(fn => fn()));
};

/**
 * Track feature usage for analytics
 * Automatically batches events to reduce database load
 */
export async function trackFeatureUsage(
  featureName: string,
  actionType: 'view' | 'click' | 'submit' | 'export' | 'create' | 'send' = 'view',
  metadata?: Record<string, any>
) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Don't track for anonymous users

    // Generate session ID if not exists
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }

    // Create analytics event
    const trackEvent = async () => {
      const { error } = await supabase
        .from('user_feature_usage')
        .insert({
          user_id: user.id,
          feature_name: featureName,
          action_type: actionType,
          session_id: sessionId,
          metadata: metadata || {},
        });

      if (error) {
        console.error('Error tracking feature usage:', error);
      }
    };

    // Add to queue
    analyticsQueue.push(trackEvent);

    // Reset debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(flushAnalyticsQueue, DEBOUNCE_DELAY);
  } catch (error) {
    console.error('Error in trackFeatureUsage:', error);
  }
}

/**
 * Track multiple feature usage events at once
 */
export async function trackFeatureUsageBatch(
  events: Array<{
    featureName: string;
    actionType?: 'view' | 'click' | 'submit' | 'export' | 'create' | 'send';
    metadata?: Record<string, any>;
  }>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }

    const trackEvents = async () => {
      const inserts = events.map(event => ({
        user_id: user.id,
        feature_name: event.featureName,
        action_type: event.actionType || 'view',
        session_id: sessionId,
        metadata: event.metadata || {},
      }));

      const { error } = await supabase
        .from('user_feature_usage')
        .insert(inserts);

      if (error) {
        console.error('Error tracking feature usage batch:', error);
      }
    };

    analyticsQueue.push(trackEvents);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(flushAnalyticsQueue, DEBOUNCE_DELAY);
  } catch (error) {
    console.error('Error in trackFeatureUsageBatch:', error);
  }
}

// Flush queue on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    flushAnalyticsQueue();
  });
}
