import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';

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
  const { user } = useAuth();
  const [kpis, setKpis] = useState<PurchasesKpis | null>(null);
  const [trend, setTrend] = useState<PurchasesTrendPoint[]>([]);
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
      console.warn('Purchases data not migrated — purchase_orders endpoint unavailable');
      if (!cancelled) {
        setKpis({ bills: 0, spend: 0, tax: 0, avg_bill_value: 0 });
        setTrend([]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, user]);

  const summary = useMemo(
    () => kpis || { bills: 0, spend: 0, tax: 0, avg_bill_value: 0 },
    [kpis]
  );
  return { kpis: summary, trend, loading, error };
}
