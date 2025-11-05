import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, Clock, Target, Loader2 } from 'lucide-react';
import { useSalesData } from '@/hooks/useSalesData';
import { startOfMonth, endOfMonth, subDays, format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SalesTrendsTab = () => {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { kpis, trend, loading } = useSalesData(dateFrom, dateTo);

  const salesData = useMemo(() => {
    if (!trend || trend.length === 0) return [];
    return trend.map((t) => ({
      date: format(new Date(t.d), 'MMM dd'),
      sales: t.sales_amount / 1000, // Convert to K
      orders: t.orders,
      avgValue: t.orders > 0 ? t.sales_amount / t.orders : 0,
    }));
  }, [trend]);

  const totalSales = useMemo(() => kpis.gmv / 1000, [kpis.gmv]);
  const totalOrders = kpis.orders;
  const avgOrderValue = kpis.avg_order_value;

  // Hourly data placeholder (can be enhanced with actual hour extraction from transaction_date)
  const hourlyData = [
    { hour: '9AM', sales: 12 },
    { hour: '10AM', sales: 18 },
    { hour: '11AM', sales: 25 },
    { hour: '12PM', sales: 32 },
    { hour: '1PM', sales: 28 },
    { hour: '2PM', sales: 35 },
    { hour: '3PM', sales: 42 },
    { hour: '4PM', sales: 38 },
    { hour: '5PM', sales: 45 },
    { hour: '6PM', sales: 52 },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold mt-2">₹{totalSales.toFixed(1)}K</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold mt-2">{totalOrders}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold mt-2">₹{avgOrderValue.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax Collected</p>
                <p className="text-2xl font-bold mt-2">₹{(kpis.tax / 1000).toFixed(1)}K</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading sales data...
            </div>
          ) : salesData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No sales data available for the selected period
            </div>
          ) : (
            <ChartContainer
            config={{
              sales: { label: 'Sales (₹K)', color: 'hsl(var(--chart-1))' },
              orders: { label: 'Orders', color: 'hsl(var(--chart-2))' },
            }}
            className="h-[300px]"
          >
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="sales" stroke="var(--color-sales)" fill="var(--color-sales)" fillOpacity={0.3} />
              <Area yAxisId="right" type="monotone" dataKey="orders" stroke="var(--color-orders)" fill="var(--color-orders)" fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Hourly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">Total Revenue</h4>
                  <p className="text-sm text-muted-foreground">₹{kpis.gmv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">Total Orders</h4>
                  <p className="text-sm text-muted-foreground">{kpis.orders} orders</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">Average Order Value</h4>
                  <p className="text-sm text-muted-foreground">₹{kpis.avg_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hourly Sales Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: { label: 'Sales', color: 'hsl(var(--primary))' },
              }}
              className="h-[250px]"
            >
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesTrendsTab;
