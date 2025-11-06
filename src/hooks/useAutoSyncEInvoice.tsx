import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Auto-sync e-invoice status every 5 minutes for invoices with IRN
 * Only syncs invoices that haven't been synced in the last 6 hours
 */
export function useAutoSyncEInvoice(salesOrderIds?: string[]) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!salesOrderIds || salesOrderIds.length === 0) return;

    const syncStatus = async () => {
      try {
        // Only sync if last sync was more than 5 minutes ago
        const now = new Date();
        const timeSinceLastSync = now.getTime() - lastSyncRef.current.getTime();
        if (timeSinceLastSync < 5 * 60 * 1000) return; // 5 minutes

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get invoices that need syncing (have IRN, not synced in last 6 hours)
        const sixHoursAgo = new Date();
        sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

        const { data: invoices, error } = await supabase
          .from('sales_orders')
          .select('id, irn, einvoice_status, einvoice_synced_at')
          .in('id', salesOrderIds)
          .not('irn', 'is', null)
          .or(`einvoice_synced_at.is.null,einvoice_synced_at.lt.${sixHoursAgo.toISOString()}`)
          .limit(10); // Sync max 10 at a time

        if (error) {
          console.warn('⚠️ Error fetching invoices for auto-sync:', error);
          return;
        }

        if (!invoices || invoices.length === 0) return;

        // Call auto-sync edge function
        const { error: syncError } = await supabase.functions.invoke('auto-sync-einvoice-status', {
          body: { invoice_ids: invoices.map(i => i.id) }
        });

        if (syncError) {
          console.warn('⚠️ Auto-sync error:', syncError);
        } else {
          console.log(`✅ Auto-synced ${invoices.length} e-invoice statuses`);
          lastSyncRef.current = new Date();
        }
      } catch (error) {
        console.warn('⚠️ Auto-sync failed:', error);
      }
    };

    // Initial sync after 30 seconds
    const initialTimeout = setTimeout(syncStatus, 30000);

    // Then sync every 5 minutes
    intervalRef.current = setInterval(syncStatus, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [salesOrderIds]);
}

