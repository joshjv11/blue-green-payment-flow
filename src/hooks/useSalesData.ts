import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesKpis {
  orders: number;
  gmv: number;
  tax: number;
  avg_order_value: number;
}

export interface SalesTrendPoint {
  d: string;
  orders: number;
  sales_amount: number;
}

export function useSalesData(dateFrom: string, dateTo: string) {
  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Try RPCs first
        const [{ data: kpiData, error: kpiErr }, { data: trendData, error: trendErr }] = await Promise.all([
          supabase.rpc('get_sales_kpis', { p_from: dateFrom, p_to: dateTo }),
          supabase.rpc('get_sales_trends', { p_from: dateFrom, p_to: dateTo })
        ]);

        if (kpiErr || trendErr) throw kpiErr || trendErr;
        if (!cancelled) {
          setKpis((kpiData as any)?.[0] || { orders: 0, gmv: 0, tax: 0, avg_order_value: 0 });
          setTrend((trendData as any) || []);
        }
      } catch (e: any) {
        // Fallback: compute from sales_orders if views not present
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');
          const { data: sales, error: se } = await supabase
            .from('sales_orders')
            .select('id, grand_total, tax_amount, transaction_date')
            .eq('user_id', user.id)
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo);
          if (se) throw se;
          const orders = sales?.length || 0;
          const gmv = (sales || []).reduce((s, r: any) => s + Number(r.grand_total || 0), 0);
          const tax = (sales || []).reduce((s, r: any) => s + Number(r.tax_amount || 0), 0);
          const avg_order_value = orders > 0 ? gmv / orders : 0;
          const byDate: Record<string, { orders: number; sales_amount: number; }> = {};
          (sales || []).forEach((r: any) => {
            const d = new Date(r.transaction_date).toISOString().slice(0, 10);
            byDate[d] = byDate[d] || { orders: 0, sales_amount: 0 };
            byDate[d].orders += 1;
            byDate[d].sales_amount += Number(r.grand_total || 0);
          });
          const trendPoints = Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([d, v]) => ({ d, orders: v.orders, sales_amount: v.sales_amount }));
          if (!cancelled) {
            setKpis({ orders, gmv, tax, avg_order_value });
            setTrend(trendPoints);
          }
        } catch (fe: any) {
          if (!cancelled) setError(fe.message || 'Failed to load sales data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  const summary = useMemo(() => kpis || { orders: 0, gmv: 0, tax: 0, avg_order_value: 0 }, [kpis]);
  return { kpis: summary, trend, loading, error };
}


