import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, Package, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { useInventoryLedger } from '@/hooks/useInventoryData';
import { startOfMonth, endOfMonth, format, subDays } from 'date-fns';
import { BackToDashboard } from '@/components/BackToDashboard';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export default function InventoryLedger() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);
  const { transactions, loading, error } = useInventoryLedger(dateFrom, dateTo, productId);

  useEffect(() => {
    async function loadProducts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('user_id', user.id)
        .order('name');
      if (data) setProducts(data);
    }
    loadProducts();
  }, []);

  const exportCsv = () => {
    const headers = ['Date', 'Product', 'SKU', 'Type', 'Quantity', 'Reference', 'Notes'];
    const rows = transactions.map((t) => [
      format(new Date(t.created_at), 'yyyy-MM-dd'),
      t.product_name,
      t.sku,
      t.txn_type,
      t.quantity.toString(),
      t.reference_type || '',
      t.notes || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_ledger_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTxnTypeIcon = (type: string) => {
    switch (type) {
      case 'in': return <ArrowDown className="h-4 w-4 text-green-600" />;
      case 'out': return <ArrowUp className="h-4 w-4 text-red-600" />;
      default: return <RefreshCw className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTxnTypeBadge = (type: string) => {
    switch (type) {
      case 'in': return <Badge variant="default" className="bg-green-100 text-green-800">In</Badge>;
      case 'out': return <Badge variant="destructive">Out</Badge>;
      default: return <Badge variant="secondary">Adjustment</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <BackToDashboard />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Inventory Ledger
            </h1>
            <p className="text-muted-foreground">Track all inventory movements and transactions</p>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <Label>Product (Optional)</Label>
                <Select value={productId || 'all'} onValueChange={(v) => setProductId(v === 'all' ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => {
                  setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                  setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                }}>
                  This Month
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading transactions...
              </div>
            ) : error ? (
              <div className="text-destructive p-4 bg-destructive/10 rounded-lg">{error}</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No inventory transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Product</th>
                      <th className="text-left p-3 font-semibold">SKU</th>
                      <th className="text-center p-3 font-semibold">Type</th>
                      <th className="text-right p-3 font-semibold">Quantity</th>
                      <th className="text-left p-3 font-semibold">Reference</th>
                      <th className="text-left p-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">{format(new Date(t.created_at), 'MMM dd, yyyy HH:mm')}</td>
                        <td className="p-3 font-medium">{t.product_name}</td>
                        <td className="p-3 text-muted-foreground">{t.sku}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getTxnTypeIcon(t.txn_type)}
                            {getTxnTypeBadge(t.txn_type)}
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold">{t.quantity}</td>
                        <td className="p-3 text-muted-foreground">{t.reference_type || '-'}</td>
                        <td className="p-3 text-sm text-muted-foreground">{t.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

