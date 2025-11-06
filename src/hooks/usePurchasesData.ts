import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PurchasesKpis {
  bills: number;
  spend: number;
  tax: number;
  avg_bill_value: number;
}

export interface PurchasesTrendPoint {
  d: string;
  bills: number;
  spend_amount: number;
}

export function usePurchasesData(dateFrom: string, dateTo: string) {
  const [kpis, setKpis] = useState<PurchasesKpis | null>(null);
  const [trend, setTrend] = useState<PurchasesTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Try RPCs first
        const { data: kpiData, error: kpiErr } = await supabase.rpc('get_purchases_kpis', {
          p_from: dateFrom,
          p_to: dateTo,
        });

        if (kpiErr) throw kpiErr;
        if (!cancelled) {
          setKpis((kpiData as any)?.[0] || { bills: 0, spend: 0, tax: 0, avg_bill_value: 0 });
          
          // Get daily trend via RPC
          const { data: trendData, error: trendErr } = await supabase.rpc('get_purchases_trends', {
            p_from: dateFrom,
            p_to: dateTo,
          });
          
          if (!trendErr && trendData) {
            setTrend((trendData as any[]).map((t: any) => ({
              d: new Date(t.d).toISOString().slice(0, 10),
              bills: t.bills || 0,
              spend_amount: Number(t.spend_amount || 0),
            })));
          }
        }
      } catch (e: any) {
        // Fallback: compute from purchase_orders if views not present
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');
          const { data: purchases, error: pe } = await supabase
            .from('purchase_orders')
            .select('id, grand_total, tax_amount, transaction_date')
            .eq('user_id', user.id)
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo);
          if (pe) throw pe;
          const bills = purchases?.length || 0;
          const spend = (purchases || []).reduce((s, r: any) => s + Number(r.grand_total || 0), 0);
          const tax = (purchases || []).reduce((s, r: any) => s + Number(r.tax_amount || 0), 0);
          const avg_bill_value = bills > 0 ? spend / bills : 0;
          const byDate: Record<string, { bills: number; spend_amount: number }> = {};
          (purchases || []).forEach((r: any) => {
            const d = new Date(r.transaction_date).toISOString().slice(0, 10);
            byDate[d] = byDate[d] || { bills: 0, spend_amount: 0 };
            byDate[d].bills += 1;
            byDate[d].spend_amount += Number(r.grand_total || 0);
          });
          const trendPoints = Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([d, v]) => ({ d, bills: v.bills, spend_amount: v.spend_amount }));
          if (!cancelled) {
            setKpis({ bills, spend, tax, avg_bill_value });
            setTrend(trendPoints);
          }
        } catch (fe: any) {
          if (!cancelled) setError(fe.message || 'Failed to load purchases data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const summary = useMemo(
    () => kpis || { bills: 0, spend: 0, tax: 0, avg_bill_value: 0 },
    [kpis]
  );
  return { kpis: summary, trend, loading, error };
}

