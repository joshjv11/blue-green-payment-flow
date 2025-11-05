import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Download, Loader2, ShoppingBag } from 'lucide-react';
import { usePurchasesData } from '@/hooks/usePurchasesData';
import { startOfMonth, endOfMonth, format, subDays } from 'date-fns';
import { BackToDashboard } from '@/components/BackToDashboard';
import { Badge } from '@/components/ui/badge';

export default function PurchasesList() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const { kpis, trend, loading, error } = usePurchasesData(dateFrom, dateTo);

  const exportCsv = () => {
    const headers = ['Date', 'Bills', 'Spend Amount'];
    const rows = trend.map((t) => [t.d, t.bills, t.spend_amount]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases_trend_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickDateRanges = [
    { label: 'Today', from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Last 7 Days', from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Last 30 Days', from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'This Month', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <BackToDashboard />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-8 w-8" />
              Purchases
            </h1>
            <p className="text-muted-foreground">Track your purchase orders, spending, and ITC</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Quick Ranges</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickDateRanges.map((range) => (
                    <Button
                      key={range.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateFrom(range.from);
                        setDateTo(range.to);
                      }}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{kpis.spend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Total purchase amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.bills}</div>
              <p className="text-xs text-muted-foreground mt-1">Purchase orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Bill Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{kpis.avg_bill_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Average per bill</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Tax Input (ITC)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{kpis.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Input tax credit</p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Purchase Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading purchase data...
              </div>
            ) : error ? (
              <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
                <p className="font-semibold">Error loading data</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : trend.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No purchase data found for the selected date range</p>
                <p className="text-sm mt-1">Create purchase orders to see analytics</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-right p-3 font-semibold">Bills</th>
                      <th className="text-right p-3 font-semibold">Spend Amount</th>
                      <th className="text-right p-3 font-semibold">Avg per Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((row) => (
                      <tr key={row.d} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-medium">{format(new Date(row.d), 'MMM dd, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(row.d), 'EEEE')}</div>
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant="secondary">{row.bills}</Badge>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          ₹{row.spend_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {row.bills > 0
                            ? `₹${(row.spend_amount / row.bills).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold">
                    <tr>
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right">{kpis.bills}</td>
                      <td className="p-3 text-right">₹{kpis.spend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right">₹{kpis.avg_bill_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

