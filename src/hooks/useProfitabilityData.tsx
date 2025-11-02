import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
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

export function useProfitabilityData(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();
  const [skuData, setSKUData] = useState<SKUProfitability[]>([]);
  const [abcData, setABCData] = useState<ABCAnalysis[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryMargin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfitabilityData();
    }
  }, [dateRange, user]);

  const fetchProfitabilityData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const currentStart = dateRange?.start || startOfMonth(new Date());
      const currentEnd = dateRange?.end || endOfMonth(new Date());
      const previousStart = subMonths(currentStart, 1);
      const previousEnd = subMonths(currentEnd, 1);

      // Fetch current period sales with product info
      // Note: order_lines don't have user_id, so we need to join with sales_orders
      const { data: currentSalesOrders } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('user_id', user.id)
        .gte('transaction_date', format(currentStart, 'yyyy-MM-dd'))
        .lte('transaction_date', format(currentEnd, 'yyyy-MM-dd'));

      const currentOrderIds = currentSalesOrders?.map(o => o.id) || [];
      
      let currentSales: any[] = [];
      if (currentOrderIds.length > 0) {
        const { data, error: salesError } = await supabase
          .from('order_lines')
          .select(`
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal,
            order_id,
            order_type
          `)
          .eq('order_type', 'sale')
          .in('order_id', currentOrderIds);

        if (salesError) throw salesError;
        currentSales = data || [];
      }

      // Fetch previous period sales
      const { data: previousSalesOrders } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('user_id', user.id)
        .gte('transaction_date', format(previousStart, 'yyyy-MM-dd'))
        .lte('transaction_date', format(previousEnd, 'yyyy-MM-dd'));

      const previousOrderIds = previousSalesOrders?.map(o => o.id) || [];
      
      let previousSales: any[] = [];
      if (previousOrderIds.length > 0) {
        const { data } = await supabase
          .from('order_lines')
          .select('product_id, subtotal')
          .eq('order_type', 'sale')
          .in('order_id', previousOrderIds);
        previousSales = data || [];
      }

      // Fetch all products with cost info
      const { data: products } = await supabase
        .from('products')
        .select('id, sku, name, purchase_price, selling_price')
        .eq('user_id', user.id);

      // Calculate profitability per SKU
      const productMap = new Map<string, SKUProfitability>();
      
      currentSales?.forEach(sale => {
        const product = products?.find(p => p.id === sale.product_id);
        if (!product) return;

        const key = product.sku;
        const existing = productMap.get(key);
        
        const revenue = Number(sale.subtotal || 0);
        const cogs = Number(sale.quantity || 0) * Number(product.purchase_price || 0);
        const profit = revenue - cogs;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        if (existing) {
          existing.unitsSold += Number(sale.quantity || 0);
          existing.totalRevenue += revenue;
          existing.totalCOGS += cogs;
          existing.grossProfit += profit;
          existing.profitMargin = existing.totalRevenue > 0 
            ? (existing.grossProfit / existing.totalRevenue) * 100 
            : 0;
        } else {
          productMap.set(key, {
            sku: product.sku,
            productName: product.name,
            category: 'General', // TODO: Add category to products table
            unitsSold: Number(sale.quantity || 0),
            totalRevenue: revenue,
            totalCOGS: cogs,
            grossProfit: profit,
            profitMargin: margin,
            previousPeriodRevenue: 0,
            previousPeriodProfit: 0,
            status: margin > 30 ? 'HIGH' : margin > 15 ? 'MEDIUM' : 'LOW'
          });
        }
      });

      // Add previous period data
      previousSales?.forEach(sale => {
        const product = products?.find(p => p.id === sale.product_id);
        if (!product) return;

        const existing = productMap.get(product.sku);
        if (existing) {
          existing.previousPeriodRevenue += Number(sale.subtotal || 0);
        }
      });

      const skuArray = Array.from(productMap.values())
        .sort((a, b) => b.grossProfit - a.grossProfit);

      setSKUData(skuArray);

      // Calculate ABC Analysis
      const totalRevenue = skuArray.reduce((sum, sku) => sum + sku.totalRevenue, 0);
      let cumulativeRevenue = 0;
      const abcCategories: Map<'A' | 'B' | 'C', SKUProfitability[]> = new Map([
        ['A', []],
        ['B', []],
        ['C', []]
      ]);

      skuArray.forEach(sku => {
        cumulativeRevenue += sku.totalRevenue;
        const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100;
        
        if (cumulativePercent <= 80) {
          abcCategories.get('A')?.push(sku);
        } else if (cumulativePercent <= 95) {
          abcCategories.get('B')?.push(sku);
        } else {
          abcCategories.get('C')?.push(sku);
        }
      });

      const abcAnalysis: ABCAnalysis[] = ['A', 'B', 'C'].map(cat => {
        const products = abcCategories.get(cat as 'A' | 'B' | 'C') || [];
        const revenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
        const avgMargin = products.length > 0
          ? products.reduce((sum, p) => sum + p.profitMargin, 0) / products.length
          : 0;

        return {
          category: cat as 'A' | 'B' | 'C',
          skuCount: products.length,
          revenuePercent: (revenue / totalRevenue) * 100,
          avgMargin,
          products
        };
      });

      setABCData(abcAnalysis);

      // Calculate Category Margins (group by category)
      const categoryMap = new Map<string, CategoryMargin>();
      
      skuArray.forEach(sku => {
        const existing = categoryMap.get(sku.category);
        if (existing) {
          existing.productCount++;
          existing.avgMargin += sku.profitMargin;
          existing.minMargin = Math.min(existing.minMargin, sku.profitMargin);
          existing.maxMargin = Math.max(existing.maxMargin, sku.profitMargin);
          existing.totalRevenue += sku.totalRevenue;
        } else {
          categoryMap.set(sku.category, {
            category: sku.category,
            productCount: 1,
            avgMargin: sku.profitMargin,
            minMargin: sku.profitMargin,
            maxMargin: sku.profitMargin,
            medianMargin: sku.profitMargin,
            totalRevenue: sku.totalRevenue
          });
        }
      });

      const categoryArray = Array.from(categoryMap.values()).map(cat => ({
        ...cat,
        avgMargin: cat.avgMargin / cat.productCount
      })).sort((a, b) => b.avgMargin - a.avgMargin);

      setCategoryData(categoryArray);

    } catch (err) {
      console.error('Error fetching profitability data:', err);
      setError('Failed to load profitability data');
    } finally {
      setLoading(false);
    }
  };

  return { skuData, abcData, categoryData, loading, error, refetch: fetchProfitabilityData };
}
