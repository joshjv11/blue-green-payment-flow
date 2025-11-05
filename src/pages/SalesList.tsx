import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { useSalesData } from '@/hooks/useSalesData';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { BackToDashboard } from '@/components/BackToDashboard';

export default function SalesList() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const { kpis, trend, loading, error } = useSalesData(dateFrom, dateTo);

  const exportCsv = () => {
    const headers = ['Date', 'Orders', 'Sales Amount'];
    const rows = trend.map(t => [t.d, t.orders, t.sales_amount]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_trend_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <BackToDashboard />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales</h1>
            <p className="text-muted-foreground">List, filters and KPIs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button variant="outline" className="mr-2" onClick={() => {
                setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              }}>
                <CalendarIcon className="h-4 w-4 mr-2" /> This Month
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle>GMV</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{kpis.gmv.toFixed(2)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Orders</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{kpis.orders}</CardContent></Card>
          <Card><CardHeader><CardTitle>Avg Order Value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{kpis.avg_order_value.toFixed(2)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Tax Collected</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{kpis.tax.toFixed(2)}</CardContent></Card>
        </div>

        {/* Trend Table (simple first iteration) */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Date</th>
                      <th className="text-right p-3">Orders</th>
                      <th className="text-right p-3">Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((row) => (
                      <tr key={row.d}>
                        <td className="p-3">{row.d}</td>
                        <td className="p-3 text-right">{row.orders}</td>
                        <td className="p-3 text-right">₹{row.sales_amount.toFixed(2)}</td>
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


