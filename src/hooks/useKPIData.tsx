import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface KPIData {
  totalRevenue: { current: number; previous: number; sparkline: number[] };
  grossProfit: { current: number; previous: number; margin: number; sparkline: number[] };
  profitMargin: { current: number; previous: number; sparkline: number[] };
  avgOrderValue: { current: number; previous: number; sparkline: number[] };
  totalUnitsSold: { current: number; previous: number; avgPerDay: number; sparkline: number[] };
  inventoryTurnover: { current: number; previous: number; sparkline: number[] };
  customerLifetimeValue: { current: number; median: number; sparkline: number[] };
  cashPosition: { current: number; change: number; sparkline: number[] };
  activeCustomers: { current: number; new: number; returning: number; sparkline: number[] };
}

const EMPTY_KPI: KPIData = {
  totalRevenue: { current: 0, previous: 0, sparkline: Array(6).fill(0) },
  grossProfit: { current: 0, previous: 0, margin: 0, sparkline: Array(6).fill(0) },
  profitMargin: { current: 0, previous: 0, sparkline: Array(6).fill(0) },
  avgOrderValue: { current: 0, previous: 0, sparkline: Array(6).fill(0) },
  totalUnitsSold: { current: 0, previous: 0, avgPerDay: 0, sparkline: Array(6).fill(0) },
  inventoryTurnover: { current: 0, previous: 0, sparkline: Array(6).fill(0) },
  customerLifetimeValue: { current: 0, median: 0, sparkline: Array(6).fill(0) },
  cashPosition: { current: 0, change: 0, sparkline: Array(6).fill(0) },
  activeCustomers: { current: 0, new: 0, returning: 0, sparkline: Array(6).fill(0) },
};

export function useKPIData(_dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIData = async () => {
    if (!user) return;
    console.warn('KPI analytics not migrated — sales_orders/purchase_orders unavailable');
    setData(EMPTY_KPI);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchKPIData();
  }, [user]);

  return { data, loading, error, refetch: fetchKPIData };
}
