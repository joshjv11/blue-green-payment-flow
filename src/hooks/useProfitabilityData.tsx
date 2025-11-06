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

      // Check if tables exist and fetch current period sales
      let currentSalesOrders: any[] = [];
      try {
        const { data, error: ordersError } = await supabase
          .from('sales_orders')
          .select('id')
          .eq('user_id', user.id)
          .gte('transaction_date', format(currentStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(currentEnd, 'yyyy-MM-dd'));

        if (ordersError) {
          // Table might not exist or no permission
          if (ordersError.code === 'PGRST204' || ordersError.code === '42P01') {
            console.warn('⚠️ sales_orders table not found, showing empty state');
            setSKUData([]);
            setABCData([]);
            setCategoryData([]);
            setLoading(false);
            return;
          }
          throw ordersError;
        }
        currentSalesOrders = data || [];
      } catch (err: any) {
        if (err?.code === 'PGRST204' || err?.code === '42P01') {
          console.warn('⚠️ sales_orders table not found');
          setSKUData([]);
          setABCData([]);
          setCategoryData([]);
          setLoading(false);
          return;
        }
        throw err;
      }

      const currentOrderIds = currentSalesOrders?.map(o => o.id) || [];
      
      let currentSales: any[] = [];
      if (currentOrderIds.length > 0) {
        // Try to select product_id, but handle if it doesn't exist
        let selectQuery = `
          product_name,
          quantity,
          unit_price,
          subtotal,
          order_id,
          order_type
        `;
        
        // Check if product_id column exists by trying to select it
        try {
          const { error: testError } = await supabase
            .from('order_lines')
            .select('product_id')
            .limit(1);
          
          // If no error, column exists - add it to select
          if (!testError || testError.code !== '42703') {
            selectQuery = `product_id, ${selectQuery}`;
          }
        } catch (e) {
          // Column doesn't exist, continue without it
          console.warn('⚠️ product_id column not found, using product_name for matching');
        }

        const { data, error: salesError } = await supabase
          .from('order_lines')
          .select(selectQuery)
          .eq('order_type', 'sale')
          .in('order_id', currentOrderIds);

        if (salesError) {
          if (salesError.code === 'PGRST204' || salesError.code === '42P01') {
            console.warn('⚠️ order_lines table not found');
            setSKUData([]);
            setABCData([]);
            setCategoryData([]);
            setLoading(false);
            return;
          }
          // If it's a column error, try without product_id
          if (salesError.code === '42703' && salesError.message?.includes('product_id')) {
            console.warn('⚠️ product_id column not found, retrying without it');
            const { data: retryData, error: retryError } = await supabase
              .from('order_lines')
              .select('product_name, quantity, unit_price, subtotal, order_id, order_type')
              .eq('order_type', 'sale')
              .in('order_id', currentOrderIds);
            
            if (retryError) throw retryError;
            currentSales = retryData || [];
          } else {
            throw salesError;
          }
        } else {
          currentSales = data || [];
        }
      }

      // Fetch previous period sales
      let previousSalesOrders: any[] = [];
      try {
        const { data } = await supabase
          .from('sales_orders')
          .select('id')
          .eq('user_id', user.id)
          .gte('transaction_date', format(previousStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(previousEnd, 'yyyy-MM-dd'));
        previousSalesOrders = data || [];
      } catch (err) {
        // Ignore previous period errors
        console.warn('⚠️ Could not fetch previous period sales:', err);
      }

      const previousOrderIds = previousSalesOrders?.map(o => o.id) || [];
      
      let previousSales: any[] = [];
      if (previousOrderIds.length > 0) {
        try {
          // Try with product_id first, fallback to just subtotal if it doesn't exist
          let selectFields = 'subtotal';
          try {
            const { error: testError } = await supabase
              .from('order_lines')
              .select('product_id')
              .limit(1);
            if (!testError || testError.code !== '42703') {
              selectFields = 'product_id, subtotal';
            }
          } catch (e) {
            // product_id doesn't exist, use product_name instead
            selectFields = 'product_name, subtotal';
          }
          
          const { data, error } = await supabase
            .from('order_lines')
            .select(selectFields)
            .eq('order_type', 'sale')
            .in('order_id', previousOrderIds);
          
          if (error && error.code === '42703' && error.message?.includes('product_id')) {
            // Retry without product_id
            const { data: retryData } = await supabase
              .from('order_lines')
              .select('product_name, subtotal')
              .eq('order_type', 'sale')
              .in('order_id', previousOrderIds);
            previousSales = retryData || [];
          } else if (error) {
            throw error;
          } else {
            previousSales = data || [];
          }
        } catch (err) {
          // Ignore previous period errors
          console.warn('⚠️ Could not fetch previous period order lines:', err);
        }
      }

      // Fetch all products with cost info
      let products: any[] = [];
      try {
        const { data, error: productsError } = await supabase
          .from('products')
          .select('id, sku, name, purchase_price, selling_price')
          .eq('user_id', user.id);

        if (productsError) {
          if (productsError.code === 'PGRST204' || productsError.code === '42P01') {
            console.warn('⚠️ products table not found');
            // Continue with empty products array
            products = [];
          } else {
            throw productsError;
          }
        } else {
          products = data || [];
        }
      } catch (err: any) {
        if (err?.code === 'PGRST204' || err?.code === '42P01') {
          products = [];
        } else {
          throw err;
        }
      }

      // If no sales data, show empty state
      if (currentSales.length === 0) {
        setSKUData([]);
        setABCData([]);
        setCategoryData([]);
        setLoading(false);
        return;
      }

      // Calculate profitability per SKU
      const productMap = new Map<string, SKUProfitability>();
      
      currentSales?.forEach(sale => {
        // Try to find product by product_id first, then by product_name
        let product = null;
        if (sale.product_id) {
          product = products?.find(p => p.id === sale.product_id);
        }
        
        // If not found by ID, try matching by name
        if (!product && sale.product_name) {
          product = products?.find(p => 
            p.name?.toLowerCase() === sale.product_name?.toLowerCase()
          );
        }

        // If still no product found, create a basic entry using product_name
        const productName = sale.product_name || 'Unknown Product';
        const productSku = product?.sku || `SKU-${productName.substring(0, 8).toUpperCase()}`;
        const key = productSku;

        const existing = productMap.get(key);
        
        const revenue = Number(sale.subtotal || 0);
        const purchasePrice = product?.purchase_price || 0;
        const cogs = Number(sale.quantity || 0) * Number(purchasePrice || 0);
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
            sku: productSku,
            productName: product?.name || productName,
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
        // Try to find product by product_id or product_name
        let product = null;
        if (sale.product_id) {
          product = products?.find(p => p.id === sale.product_id);
        }
        if (!product && sale.product_name) {
          product = products?.find(p => 
            p.name?.toLowerCase() === sale.product_name?.toLowerCase()
          );
        }
        
        if (product) {
          const existing = productMap.get(product.sku);
          if (existing) {
            existing.previousPeriodRevenue += Number(sale.subtotal || 0);
          }
        } else if (sale.product_name) {
          // Try to match by product name from current sales
          const productName = sale.product_name;
          const matchingSku = Array.from(productMap.keys()).find(sku => {
            const item = productMap.get(sku);
            return item?.productName?.toLowerCase() === productName.toLowerCase();
          });
          if (matchingSku) {
            const existing = productMap.get(matchingSku);
            if (existing) {
              existing.previousPeriodRevenue += Number(sale.subtotal || 0);
            }
          }
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

    } catch (err: any) {
      console.error('Error fetching profitability data:', err);
      
      // Provide more specific error messages
      if (err?.code === 'PGRST204' || err?.code === '42P01') {
        setError('Sales and inventory tables are not set up yet. Please create some sales orders first.');
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err?.code === '42501') {
        setError('Permission denied. Please log in again.');
      } else {
        setError(err?.message || 'Failed to load profitability data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { skuData, abcData, categoryData, loading, error, refetch: fetchProfitabilityData };
}
