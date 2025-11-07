import { useEffect } from 'react';

/**
 * Auto-sync e-invoice status - DISABLED
 * Requires 'irn' column in sales_orders table
 */
export function useAutoSyncEInvoice(_salesOrderIds?: string[]) {
  useEffect(() => {
    // Feature disabled - requires database migration
    console.log('⚠️ Auto-sync e-invoice feature disabled - requires database migration');
  }, []);
}
