import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import * as invoicesApi from '@/lib/endpoints/invoices';

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
  const { user } = useAuth();
  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const invoices = await invoicesApi.listInvoices();
        const sales = invoices.filter((inv) => {
          const d = inv.issuedate?.slice(0, 10) || inv.duedate?.slice(0, 10);
          return d && d >= dateFrom && d <= dateTo;
        });
        const orders = sales.length;
        const gmv = sales.reduce((s, r) => s + Number(r.amount || 0), 0);
        const tax = sales.reduce((s, r) => s + Number(r.taxamount || 0), 0);
        const avg_order_value = orders > 0 ? gmv / orders : 0;
        const byDate: Record<string, { orders: number; sales_amount: number }> = {};
        sales.forEach((r) => {
          const d = (r.issuedate || r.duedate || '').slice(0, 10);
          if (!d) return;
          byDate[d] = byDate[d] || { orders: 0, sales_amount: 0 };
          byDate[d].orders += 1;
          byDate[d].sales_amount += Number(r.amount || 0);
        });
        const trendPoints = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([d, v]) => ({ d, orders: v.orders, sales_amount: v.sales_amount }));
        if (!cancelled) {
          setKpis({ orders, gmv, tax, avg_order_value });
          setTrend(trendPoints);
        }
      } catch (fe: unknown) {
        if (!cancelled) {
          const message = fe instanceof Error ? fe.message : 'Failed to load sales data';
          console.warn('Sales data fallback:', message);
          setKpis({ orders: 0, gmv: 0, tax: 0, avg_order_value: 0 });
          setTrend([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, user]);

  const summary = useMemo(() => kpis || { orders: 0, gmv: 0, tax: 0, avg_order_value: 0 }, [kpis]);
  return { kpis: summary, trend, loading, error };
}
