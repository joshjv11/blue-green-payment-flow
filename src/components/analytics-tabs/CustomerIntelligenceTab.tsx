import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Star, TrendingUp, Activity } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CustomerIntelligenceTab = () => {
  const customerSegments = [
    { segment: 'VIP', count: 45, revenue: 450000, color: 'hsl(var(--chart-1))' },
    { segment: 'Regular', count: 178, revenue: 890000, color: 'hsl(var(--chart-2))' },
    { segment: 'New', count: 89, revenue: 267000, color: 'hsl(var(--chart-3))' },
    { segment: 'At Risk', count: 23, revenue: 92000, color: 'hsl(var(--chart-4))' },
  ];

  const topCustomers = [
    { name: 'Rajesh Kumar', orders: 45, value: 125000, segment: 'VIP', satisfaction: 98 },
    { name: 'Priya Sharma', orders: 38, value: 98000, segment: 'VIP', satisfaction: 95 },
    { name: 'Amit Patel', orders: 32, value: 87000, segment: 'Regular', satisfaction: 92 },
    { name: 'Sneha Reddy', orders: 28, value: 76000, segment: 'Regular', satisfaction: 90 },
    { name: 'Vikram Singh', orders: 25, value: 68000, segment: 'Regular', satisfaction: 88 },
  ];

  const retentionData = [
    { month: 'Jan', rate: 85 },
    { month: 'Feb', rate: 87 },
    { month: 'Mar', rate: 84 },
    { month: 'Apr', rate: 89 },
    { month: 'May', rate: 91 },
    { month: 'Jun', rate: 93 },
  ];

  const totalCustomers = customerSegments.reduce((sum, seg) => sum + seg.count, 0);
  const totalRevenue = customerSegments.reduce((sum, seg) => sum + seg.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold mt-2">{totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer LTV</p>
                <p className="text-2xl font-bold mt-2">₹{(totalRevenue / totalCustomers / 1000).toFixed(1)}K</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold mt-2">93%</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Satisfaction</p>
                <p className="text-2xl font-bold mt-2">4.6/5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <PieChart>
                <Pie
                  data={customerSegments}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.segment}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {customerSegments.map((entry, index) => (
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
            <CardTitle>Retention Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                rate: { label: 'Retention %', color: 'hsl(var(--primary))' },
              }}
              className="h-[250px]"
            >
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="rate" fill="var(--color-rate)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <div key={customer.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{customer.name}</h4>
                      <Badge variant="secondary">{customer.segment}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Satisfaction</span>
                        <span>{customer.satisfaction}%</span>
                      </div>
                      <Progress value={customer.satisfaction} className="h-1.5" />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold">₹{(customer.value / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-muted-foreground">Total value</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerIntelligenceTab;
