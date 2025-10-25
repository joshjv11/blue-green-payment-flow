import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const ProfitabilityTab = () => {
  const profitLossData = [
    { month: 'Jan', revenue: 125000, costs: 85000, profit: 40000 },
    { month: 'Feb', revenue: 142000, costs: 92000, profit: 50000 },
    { month: 'Mar', revenue: 138000, costs: 88000, profit: 50000 },
    { month: 'Apr', revenue: 165000, costs: 98000, profit: 67000 },
    { month: 'May', revenue: 155000, costs: 95000, profit: 60000 },
    { month: 'Jun', revenue: 180000, costs: 105000, profit: 75000 },
  ];

  const marginData = [
    { category: 'Electronics', margin: 28, target: 30 },
    { category: 'Clothing', margin: 45, target: 40 },
    { category: 'Food', margin: 18, target: 20 },
    { category: 'Books', margin: 35, target: 30 },
    { category: 'Accessories', margin: 52, target: 50 },
  ];

  const totalRevenue = profitLossData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCosts = profitLossData.reduce((sum, item) => sum + item.costs, 0);
  const totalProfit = totalRevenue - totalCosts;
  const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-2">₹{(totalRevenue / 1000).toFixed(0)}K</p>
                <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5%
                </Badge>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Costs</p>
                <p className="text-2xl font-bold mt-2">₹{(totalCosts / 1000).toFixed(0)}K</p>
                <Badge variant="outline" className="mt-2 text-orange-600 border-orange-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.3%
                </Badge>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold mt-2">₹{(totalProfit / 1000).toFixed(0)}K</p>
                <Badge variant="outline" className="mt-2 text-blue-600 border-blue-600">
                  Margin: {profitMargin}%
                </Badge>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Loss Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
              costs: { label: 'Costs', color: 'hsl(var(--chart-2))' },
              profit: { label: 'Profit', color: 'hsl(var(--chart-3))' },
            }}
            className="h-[350px]"
          >
            <BarChart data={profitLossData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="revenue" fill="var(--color-revenue)" />
              <Bar dataKey="costs" fill="var(--color-costs)" />
              <Bar dataKey="profit" fill="var(--color-profit)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Margin Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Margin by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {marginData.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Target: {item.target}%
                    </span>
                    <Badge
                      variant={item.margin >= item.target ? 'default' : 'secondary'}
                    >
                      {item.margin}%
                    </Badge>
                  </div>
                </div>
                <Progress value={item.margin} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityTab;
