import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface SKUProfitability {
  sku: string;
  productName: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  profitMargin: number;
  previousPeriodRevenue: number;
  previousPeriodProfit: number;
  status: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ABCAnalysis {
  category: 'A' | 'B' | 'C';
  skuCount: number;
  revenuePercent: number;
  avgMargin: number;
  products: SKUProfitability[];
}

export interface CategoryMargin {
  category: string;
  productCount: number;
  avgMargin: number;
  minMargin: number;
  maxMargin: number;
  medianMargin: number;
  totalRevenue: number;
}

export function useProfitabilityData(_dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();
  const [skuData, setSKUData] = useState<SKUProfitability[]>([]);
  const [abcData, setABCData] = useState<ABCAnalysis[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryMargin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfitabilityData = async () => {
    if (!user) return;
    console.warn('Profitability analytics not migrated — products/order_lines unavailable');
    setSKUData([]);
    setABCData([]);
    setCategoryData([]);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchProfitabilityData();
  }, [user]);

  return { skuData, abcData, categoryData, loading, error, refetch: fetchProfitabilityData };
}
