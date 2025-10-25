import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Package } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const OverviewTab = () => {
  // Mock data for demonstration
  const kpiData = [
    { label: 'Total Revenue', value: '₹2,45,680', change: '+12.5%', trend: 'up', icon: DollarSign },
    { label: 'Active Customers', value: '342', change: '+8.2%', trend: 'up', icon: Users },
    { label: 'Total Orders', value: '1,234', change: '-3.1%', trend: 'down', icon: ShoppingCart },
    { label: 'Products Sold', value: '5,678', change: '+15.3%', trend: 'up', icon: Package },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 52000 },
    { month: 'Mar', revenue: 48000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 55000 },
    { month: 'Jun', revenue: 73000 },
  ];

  const categoryData = [
    { name: 'Electronics', value: 35, color: 'hsl(var(--chart-1))' },
    { name: 'Clothing', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'Food', value: 20, color: 'hsl(var(--chart-3))' },
    { name: 'Books', value: 12, color: 'hsl(var(--chart-4))' },
    { name: 'Others', value: 8, color: 'hsl(var(--chart-5))' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-2">{kpi.value}</p>
                    <Badge
                      variant="outline"
                      className={`mt-2 ${
                        kpi.trend === 'up'
                          ? 'text-green-600 border-green-600'
                          : 'text-red-600 border-red-600'
                      }`}
                    >
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {kpi.change}
                    </Badge>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
            }}
            className="h-[300px]"
          >
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{}}
              className="h-[250px]"
            >
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Best Performing Month</p>
                  <p className="text-xs text-muted-foreground">June 2024</p>
                </div>
                <Badge variant="secondary">₹73,000</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Average Order Value</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
                <Badge variant="secondary">₹1,234</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Customer Retention</p>
                  <p className="text-xs text-muted-foreground">Returning customers</p>
                </div>
                <Badge variant="secondary">68%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
