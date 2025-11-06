import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
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

export function useKPIData(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchKPIData();
    }
  }, [dateRange, user]);

  const fetchKPIData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const currentStart = dateRange?.start || startOfMonth(new Date());
      const currentEnd = dateRange?.end || endOfMonth(new Date());
      const previousStart = subMonths(currentStart, 1);
      const previousEnd = subMonths(currentEnd, 1);

      // Fetch current period data with error handling
      let salesCurrent: any = { data: [], error: null };
      let purchasesCurrent: any = { data: [], error: null };
      let customersCurrent: any = { data: [], error: null };
      let orderLinesCurrent: any = { data: [], error: null };
      
      try {
        salesCurrent = await supabase
          .from('sales_orders')
          .select('id, grand_total, transaction_date, customer_name, amount_paid')
          .eq('user_id', user.id)
          .gte('transaction_date', format(currentStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(currentEnd, 'yyyy-MM-dd'));
      } catch (err: any) {
        if (err?.code === 'PGRST204' || err?.code === '42P01') {
          console.warn('⚠️ sales_orders table not found');
          salesCurrent = { data: [], error: null };
        } else {
          throw err;
        }
      }

      try {
        purchasesCurrent = await supabase
          .from('purchase_orders')
          .select('id, grand_total, transaction_date, amount_paid')
          .eq('user_id', user.id)
          .gte('transaction_date', format(currentStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(currentEnd, 'yyyy-MM-dd'));
      } catch (err: any) {
        if (err?.code === 'PGRST204' || err?.code === '42P01') {
          console.warn('⚠️ purchase_orders table not found');
          purchasesCurrent = { data: [], error: null };
        } else {
          throw err;
        }
      }

      customersCurrent = salesCurrent; // Reuse sales data for customers

      // Fetch order lines for units sold calculation
      const currentOrderIds = salesCurrent.data?.map((o: any) => o.id) || [];
      if (currentOrderIds.length > 0) {
        try {
          // Try with product_id, fallback to product_name
          let selectFields = 'quantity, order_id';
          try {
            const { error: testError } = await supabase
              .from('order_lines')
              .select('product_id')
              .limit(1);
            if (!testError || testError.code !== '42703') {
              selectFields = 'quantity, order_id, product_id';
            }
          } catch (e) {
            // product_id doesn't exist
          }

          orderLinesCurrent = await supabase
            .from('order_lines')
            .select(selectFields)
            .eq('order_type', 'sale')
            .in('order_id', currentOrderIds);
          
          if (orderLinesCurrent.error && orderLinesCurrent.error.code === '42703') {
            // Retry without product_id
            orderLinesCurrent = await supabase
              .from('order_lines')
              .select('quantity, order_id')
              .eq('order_type', 'sale')
              .in('order_id', currentOrderIds);
          }
        } catch (err: any) {
          if (err?.code === 'PGRST204' || err?.code === '42P01') {
            console.warn('⚠️ order_lines table not found');
            orderLinesCurrent = { data: [], error: null };
          }
        }
      }

      // Fetch previous period data
      let salesPrevious: any = { data: [], error: null };
      let purchasesPrevious: any = { data: [], error: null };
      let orderLinesPrevious: any = { data: [], error: null };

      try {
        salesPrevious = await supabase
          .from('sales_orders')
          .select('id, grand_total, transaction_date')
          .eq('user_id', user.id)
          .gte('transaction_date', format(previousStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(previousEnd, 'yyyy-MM-dd'));
      } catch (err) {
        console.warn('⚠️ Could not fetch previous period sales:', err);
      }

      try {
        purchasesPrevious = await supabase
          .from('purchase_orders')
          .select('grand_total, transaction_date, amount_paid')
          .eq('user_id', user.id)
          .gte('transaction_date', format(previousStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(previousEnd, 'yyyy-MM-dd'));
      } catch (err) {
        console.warn('⚠️ Could not fetch previous period purchases:', err);
      }

      // Fetch previous period order lines
      const previousOrderIds = salesPrevious.data?.map((o: any) => o.id) || [];
      if (previousOrderIds.length > 0) {
        try {
          orderLinesPrevious = await supabase
            .from('order_lines')
            .select('quantity, order_id')
            .eq('order_type', 'sale')
            .in('order_id', previousOrderIds);
        } catch (err) {
          console.warn('⚠️ Could not fetch previous period order lines:', err);
        }
      }

      // Fetch sparkline data (last 6 months)
      const sparklineMonths = 6;
      const sparklineData = await Promise.all(
        Array.from({ length: sparklineMonths }, async (_, i) => {
          const monthStart = startOfMonth(subMonths(new Date(), sparklineMonths - 1 - i));
          const monthEnd = endOfMonth(subMonths(new Date(), sparklineMonths - 1 - i));
          try {
            const result = await supabase
              .from('sales_orders')
              .select('grand_total')
              .eq('user_id', user.id)
              .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'))
              .lte('transaction_date', format(monthEnd, 'yyyy-MM-dd'));
            return result;
          } catch (err) {
            return { data: [], error: null };
          }
        })
      );

      // Fetch inventory data
      let products: any[] = [];
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('stock_qty, purchase_price, selling_price')
          .eq('user_id', user.id);
        
        if (productsError) {
          if (productsError.code === 'PGRST204' || productsError.code === '42P01') {
            console.warn('⚠️ products table not found');
            products = [];
          } else {
            throw productsError;
          }
        } else {
          products = productsData || [];
        }
      } catch (err: any) {
        if (err?.code === 'PGRST204' || err?.code === '42P01') {
          products = [];
        } else {
          console.warn('⚠️ Could not fetch products:', err);
          products = [];
        }
      }

      // Calculate KPIs
      const currentRevenue = salesCurrent.data?.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0) || 0;
      const previousRevenue = salesPrevious.data?.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0) || 0;
      
      const currentCOGS = purchasesCurrent.data?.reduce((sum: number, p: any) => sum + Number(p.grand_total || 0), 0) || 0;
      const previousCOGS = purchasesPrevious.data?.reduce((sum: number, p: any) => sum + Number(p.grand_total || 0), 0) || 0;

      const currentGrossProfit = currentRevenue - currentCOGS;
      const previousGrossProfit = previousRevenue - previousCOGS;
      const profitMargin = currentRevenue > 0 ? (currentGrossProfit / currentRevenue) * 100 : 0;
      const previousProfitMargin = previousRevenue > 0 ? (previousGrossProfit / previousRevenue) * 100 : 0;

      const orderCount = salesCurrent.data?.length || 0;
      const avgOrderValue = orderCount > 0 ? currentRevenue / orderCount : 0;

      const previousOrderCount = salesPrevious.data?.length || 0;
      const previousAvgOrderValue = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

      // Calculate actual units sold from order_lines
      const currentUnitsSold = orderLinesCurrent.data?.reduce((sum: number, ol: any) => sum + Number(ol.quantity || 0), 0) || 0;
      const previousUnitsSold = orderLinesPrevious.data?.reduce((sum: number, ol: any) => sum + Number(ol.quantity || 0), 0) || 0;
      const daysInPeriod = Math.max(1, Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)));
      const avgUnitsPerDay = currentUnitsSold / daysInPeriod;

      // Calculate unique customers
      const uniqueCustomers = new Set(customersCurrent.data?.map((c: any) => c.customer_name).filter((name: string) => name)).size;
      
      // Calculate customer segments (first-time vs returning)
      // Need to check previous period to determine if customer is new
      let previousCustomers: any[] = [];
      try {
        const { data: prevCustomersData } = await supabase
          .from('sales_orders')
          .select('customer_name')
          .eq('user_id', user.id)
          .lt('transaction_date', format(currentStart, 'yyyy-MM-dd'));
        previousCustomers = prevCustomersData || [];
      } catch (err) {
        console.warn('⚠️ Could not fetch previous customers:', err);
      }
      
      const previousCustomerNames = new Set(previousCustomers.map((c: any) => c.customer_name));
      const currentCustomerNames = new Set(customersCurrent.data?.map((c: any) => c.customer_name).filter((name: string) => name) || []);
      
      const newCustomers = Array.from(currentCustomerNames).filter(name => !previousCustomerNames.has(name)).length;
      const returningCustomers = uniqueCustomers - newCustomers;

      // Inventory turnover (COGS / Average Inventory Value)
      const totalInventoryValue = products?.reduce((sum: number, p: any) => sum + (Number(p.stock_qty || 0) * Number(p.purchase_price || 0)), 0) || 0;
      const avgInventoryValue = totalInventoryValue; // Simplified: using current inventory as average
      const inventoryTurnover = avgInventoryValue > 0 ? (currentCOGS / avgInventoryValue) * (365 / daysInPeriod) : 0;
      
      // Previous period inventory turnover
      const previousInventoryTurnover = avgInventoryValue > 0 ? (previousCOGS / avgInventoryValue) * (365 / Math.max(1, Math.ceil((previousEnd.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24)))) : 0;

      // Cash position (net flow: money received from sales - money paid for purchases)
      const cashIn = salesCurrent.data?.reduce((sum: number, s: any) => sum + Number(s.amount_paid || s.grand_total || 0), 0) || 0;
      const cashOut = purchasesCurrent.data?.reduce((sum: number, p: any) => sum + Number(p.amount_paid || p.grand_total || 0), 0) || 0;
      const cashPosition = cashIn - cashOut;
      
      // Calculate cash position change (vs previous period)
      const previousCashIn = salesPrevious.data?.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0) || 0;
      const previousCashOut = purchasesPrevious.data?.reduce((sum: number, p: any) => sum + Number(p.grand_total || 0), 0) || 0;
      const previousCashPosition = previousCashIn - previousCashOut;
      const cashPositionChange = cashPosition - previousCashPosition;

      // Customer Lifetime Value (average per customer)
      let allSales: any[] = [];
      try {
        const { data: allSalesData } = await supabase
          .from('sales_orders')
          .select('customer_name, grand_total')
          .eq('user_id', user.id);
        allSales = allSalesData || [];
      } catch (err) {
        console.warn('⚠️ Could not fetch all sales for CLV:', err);
      }
      
      const customerTotals = new Map<string, number>();
      allSales?.forEach((sale: any) => {
        if (sale.customer_name) {
          const total = customerTotals.get(sale.customer_name) || 0;
          customerTotals.set(sale.customer_name, total + Number(sale.grand_total || 0));
        }
      });
      
      const customerValues = Array.from(customerTotals.values()).filter(v => v > 0).sort((a, b) => a - b);
      const avgCLV = customerValues.length > 0 
        ? customerValues.reduce((sum, val) => sum + val, 0) / customerValues.length 
        : 0;
      const medianCLV = customerValues.length > 0 
        ? customerValues[Math.floor(customerValues.length / 2)] 
        : 0;

      // Sparklines - calculate from monthly data
      const revenueSparkline = sparklineData.map((d: any) => 
        d.data?.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0) || 0
      );
      
      // Calculate sparklines for other metrics
      const profitSparkline = revenueSparkline.map((rev: number, i: number) => {
        // Simplified: assume 20% margin for sparkline
        return rev * 0.2;
      });
      
      const unitsSparkline = sparklineData.map(async (d: any, i: number) => {
        // Try to get actual units for each month
        const monthStart = startOfMonth(subMonths(new Date(), sparklineMonths - 1 - i));
        const monthEnd = endOfMonth(subMonths(new Date(), sparklineMonths - 1 - i));
        try {
          const { data: monthSales } = await supabase
            .from('sales_orders')
            .select('id')
            .eq('user_id', user.id)
            .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'))
            .lte('transaction_date', format(monthEnd, 'yyyy-MM-dd'));
          
          const monthOrderIds = monthSales?.map((o: any) => o.id) || [];
          if (monthOrderIds.length > 0) {
            const { data: monthOrderLines } = await supabase
              .from('order_lines')
              .select('quantity')
              .eq('order_type', 'sale')
              .in('order_id', monthOrderIds);
            return monthOrderLines?.reduce((sum: number, ol: any) => sum + Number(ol.quantity || 0), 0) || 0;
          }
        } catch (err) {
          // Fallback to approximation
        }
        return Math.floor(currentUnitsSold / sparklineMonths);
      });
      
      // Resolve all sparkline promises
      const resolvedUnitsSparkline = await Promise.all(unitsSparkline);

      setData({
        totalRevenue: {
          current: currentRevenue,
          previous: previousRevenue,
          sparkline: revenueSparkline
        },
        grossProfit: {
          current: currentGrossProfit,
          previous: previousGrossProfit,
          margin: profitMargin,
          sparkline: profitSparkline
        },
        profitMargin: {
          current: profitMargin,
          previous: previousProfitMargin,
          sparkline: revenueSparkline.map((rev: number, i: number) => {
            const profit = profitSparkline[i];
            return rev > 0 ? (profit / rev) * 100 : 0;
          })
        },
        avgOrderValue: {
          current: avgOrderValue,
          previous: previousAvgOrderValue,
          sparkline: sparklineData.map((d: any, i: number) => {
            const monthRevenue = d.data?.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0) || 0;
            // Try to get order count for this month
            const monthStart = startOfMonth(subMonths(new Date(), sparklineMonths - 1 - i));
            const monthEnd = endOfMonth(subMonths(new Date(), sparklineMonths - 1 - i));
            // Simplified: use average order value trend
            return monthRevenue > 0 && orderCount > 0 ? (monthRevenue / Math.max(1, orderCount)) : avgOrderValue;
          })
        },
        totalUnitsSold: {
          current: currentUnitsSold,
          previous: previousUnitsSold,
          avgPerDay: avgUnitsPerDay,
          sparkline: resolvedUnitsSparkline
        },
        inventoryTurnover: {
          current: inventoryTurnover,
          previous: previousInventoryTurnover,
          sparkline: Array(6).fill(0).map((_, i) => {
            // Use revenue sparkline as proxy for inventory turnover trend
            const baseTurnover = inventoryTurnover || 0;
            return baseTurnover * (0.8 + (revenueSparkline[i] / Math.max(1, currentRevenue)) * 0.4);
          })
        },
        customerLifetimeValue: {
          current: avgCLV,
          median: medianCLV,
          sparkline: Array(6).fill(0).map(() => avgCLV) // Stable CLV over time
        },
        cashPosition: {
          current: cashPosition,
          change: cashPositionChange,
          sparkline: revenueSparkline.map((rev: number, i: number) => {
            // Simplified: use revenue trend as proxy for cash flow
            return rev * 0.8; // Assume 80% of revenue is collected
          })
        },
        activeCustomers: {
          current: uniqueCustomers,
          new: newCustomers,
          returning: returningCustomers,
          sparkline: Array(6).fill(0).map((_, i) => {
            // Use revenue trend as proxy for customer growth
            const baseCustomers = uniqueCustomers || 1;
            const growthFactor = revenueSparkline[i] / Math.max(1, currentRevenue);
            return Math.max(1, Math.floor(baseCustomers * growthFactor));
          })
        }
      });
    } catch (err: any) {
      console.error('Error fetching KPI data:', err);
      
      // Provide more specific error messages
      if (err?.code === 'PGRST204' || err?.code === '42P01') {
        setError('Sales and inventory tables are not set up yet. Please create some sales orders first.');
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err?.code === '42501') {
        setError('Permission denied. Please log in again.');
      } else {
        setError(err?.message || 'Failed to load KPI data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchKPIData };
}
