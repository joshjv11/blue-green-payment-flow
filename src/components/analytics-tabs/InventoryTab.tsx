import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Package, TrendingUp, ArrowDown, Loader2 } from 'lucide-react';
import { useInventoryKpis, useStockTurnover, useReorderSuggestions } from '@/hooks/useInventoryData';
import { subDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const InventoryTab = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { kpis, loading: kpisLoading } = useInventoryKpis();
  const { turnover } = useStockTurnover(
    format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    format(new Date(), 'yyyy-MM-dd')
  );
  const { suggestions } = useReorderSuggestions(7, 1.65);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, stock_qty, reorder_level, purchase_price')
        .eq('user_id', user.id)
        .order('name');
      if (data) setProducts(data);
      setLoading(false);
    }
    load();
  }, []);

  const inventoryData = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock_qty,
    reorderLevel: p.reorder_level,
    status: p.stock_qty <= p.reorder_level * 0.5 ? 'critical' : p.stock_qty <= p.reorder_level ? 'low' : 'healthy',
    value: p.stock_qty * p.purchase_price,
  }));

  const totalValue = kpis?.total_value ?? inventoryData.reduce((sum, item) => sum + item.value, 0);
  const criticalItems = kpis?.critical_count ?? inventoryData.filter(item => item.status === 'critical').length;
  const lowStockItems = kpis?.low_stock_count ?? inventoryData.filter(item => item.status === 'low').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'low':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
                <p className="text-2xl font-bold mt-2">₹{(totalValue / 1000).toFixed(0)}K</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold mt-2">{kpis?.total_skus ?? inventoryData.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold mt-2">{lowStockItems}</p>
              </div>
              <ArrowDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Items</p>
                <p className="text-2xl font-bold mt-2">{criticalItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryData.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{item.name}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">SKU: {item.sku}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Stock: {item.stock} units</span>
                      <span>Reorder: {item.reorderLevel}</span>
                    </div>
                    <Progress 
                      value={(item.stock / item.reorderLevel) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium">₹{(item.value / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-muted-foreground">Value</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reorder Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reorder Suggestions
            </CardTitle>
            <CardDescription>Products that need restocking based on demand forecasting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.slice(0, 5).map((s) => (
                <div key={s.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{s.product_name}</h4>
                    <p className="text-sm text-muted-foreground">Current: {s.current_stock} | Reorder Point: {Math.ceil(s.reorder_point)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{Math.ceil(s.suggested_order_qty)}</p>
                    <p className="text-xs text-muted-foreground">Suggested Qty</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InventoryTab;
