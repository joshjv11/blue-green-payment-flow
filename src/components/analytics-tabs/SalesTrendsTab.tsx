import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, Clock, Target } from 'lucide-react';

const SalesTrendsTab = () => {
  const salesData = [
    { date: 'Mon', sales: 45, orders: 12, avgValue: 3750 },
    { date: 'Tue', sales: 52, orders: 15, avgValue: 3467 },
    { date: 'Wed', sales: 48, orders: 14, avgValue: 3429 },
    { date: 'Thu', sales: 61, orders: 18, avgValue: 3389 },
    { date: 'Fri', sales: 73, orders: 21, avgValue: 3476 },
    { date: 'Sat', sales: 85, orders: 25, avgValue: 3400 },
    { date: 'Sun', sales: 68, orders: 19, avgValue: 3579 },
  ];

  const productTrends = [
    { product: 'Wireless Mouse', sales: 145, trend: '+23%', growth: 'up' },
    { product: 'USB-C Cable', sales: 234, trend: '+45%', growth: 'up' },
    { product: 'Keyboard', sales: 89, trend: '-12%', growth: 'down' },
    { product: 'Monitor', sales: 56, trend: '+8%', growth: 'up' },
    { product: 'Laptop Stand', sales: 78, trend: '+15%', growth: 'up' },
  ];

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

  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
  const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0);
  const avgOrderValue = totalSales / totalOrders;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weekly Sales</p>
                <p className="text-2xl font-bold mt-2">₹{totalSales}K</p>
                <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +18.2%
                </Badge>
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
                <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                <p className="text-2xl font-bold mt-2">6 PM</p>
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
        </CardContent>
      </Card>

      {/* Product Trends & Hourly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Product Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productTrends.map((product) => (
                <div key={product.product} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.product}</h4>
                    <p className="text-sm text-muted-foreground">{product.sales} units sold</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      product.growth === 'up'
                        ? 'text-green-600 border-green-600'
                        : 'text-red-600 border-red-600'
                    }
                  >
                    {product.trend}
                  </Badge>
                </div>
              ))}
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
