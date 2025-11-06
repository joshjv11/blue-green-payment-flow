import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface InventoryKpis {
  total_skus: number;
  total_value: number;
  low_stock_count: number;
  critical_count: number;
  avg_turnover_days: number;
}

export interface StockTurnoverItem {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  sales_qty: number;
  turnover_ratio: number;
  days_of_inventory: number | null;
}

export interface ReorderSuggestion {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_level: number;
  avg_daily_demand: number;
  safety_stock: number;
  reorder_point: number;
  suggested_order_qty: number;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  txn_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

export function useInventoryKpis() {
  const [kpis, setKpis] = useState<InventoryKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase.rpc('get_inventory_kpis');
        if (err) throw err;
        if (!cancelled && data && data.length > 0) {
          setKpis(data[0] as InventoryKpis);
        } else if (!cancelled) {
          setKpis({ total_skus: 0, total_value: 0, low_stock_count: 0, critical_count: 0, avg_turnover_days: 0 });
        }
      } catch (e: any) {
        // Fallback: compute from products table
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');
          const { data: products, error: pe } = await supabase
            .from('products')
            .select('id, stock_qty, reorder_level, purchase_price')
            .eq('user_id', user.id);
          if (pe) throw pe;
          const total_skus = products?.length || 0;
          const total_value = (products || []).reduce((s, p: any) => s + (p.stock_qty * p.purchase_price), 0);
          const low_stock_count = (products || []).filter((p: any) => p.stock_qty <= p.reorder_level).length;
          const critical_count = (products || []).filter((p: any) => p.stock_qty <= (p.reorder_level * 0.5)).length;
          if (!cancelled) {
            setKpis({ total_skus, total_value, low_stock_count, critical_count, avg_turnover_days: 0 });
          }
        } catch (fe: any) {
          if (!cancelled) setError(fe.message || 'Failed to load inventory KPIs');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { kpis, loading, error };
}

export function useStockTurnover(dateFrom: string, dateTo: string) {
  const [turnover, setTurnover] = useState<StockTurnoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase.rpc('get_stock_turnover', {
          p_from: dateFrom,
          p_to: dateTo,
        });
        if (err) throw err;
        if (!cancelled) {
          setTurnover((data as any[]) || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load stock turnover');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return { turnover, loading, error };
}

export function useReorderSuggestions(leadDays: number = 7, serviceLevel: number = 1.65) {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase.rpc('get_reorder_suggestions', {
          p_lead_days: leadDays,
          p_service_level: serviceLevel,
        });
        if (err) throw err;
        if (!cancelled) {
          setSuggestions((data as any[]) || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load reorder suggestions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [leadDays, serviceLevel]);

  return { suggestions, loading, error };
}

export function useInventoryLedger(dateFrom?: string, dateTo?: string, productId?: string) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        let query = supabase
          .from('inventory_txns')
          .select(`
            id,
            product_id,
            txn_type,
            quantity,
            reference_type,
            notes,
            created_at,
            products!inner(name, sku, user_id)
          `)
          .eq('products.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500);

        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);
        if (productId) query = query.eq('product_id', productId);

        const { data, error: err } = await query;
        if (err) throw err;
        if (!cancelled) {
          setTransactions((data as any[] || []).map((t: any) => ({
            id: t.id,
            product_id: t.product_id,
            product_name: t.products?.name || '',
            sku: t.products?.sku || '',
            txn_type: t.txn_type,
            quantity: t.quantity,
            reference_type: t.reference_type,
            notes: t.notes,
            created_at: t.created_at,
          })));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load inventory ledger');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, productId]);

  return { transactions, loading, error };
}

