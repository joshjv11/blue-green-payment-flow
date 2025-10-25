import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ABCAnalysis as ABCData } from '@/hooks/useProfitabilityData';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, Target, AlertCircle } from 'lucide-react';

interface Props {
  data: ABCData[];
}

export function ABCAnalysis({ data }: Props) {
  const pieData = data.map(item => ({
    name: `${item.category} Products`,
    value: item.revenuePercent,
    count: item.skuCount,
    margin: item.avgMargin
  }));

  const COLORS = {
    A: 'hsl(var(--primary))',
    B: 'hsl(var(--chart-2))',
    C: 'hsl(var(--muted-foreground))'
  };

  const getCardData = (category: 'A' | 'B' | 'C') => {
    const item = data.find(d => d.category === category);
    if (!item) return null;

    const configs = {
      A: {
        title: 'A Products (High Value)',
        color: 'bg-primary/10 border-primary',
        icon: TrendingUp,
        action: 'Focus on A Products',
        description: 'Top performers driving 70-80% of revenue'
      },
      B: {
        title: 'B Products (Medium Value)',
        color: 'bg-chart-2/10 border-chart-2',
        icon: Target,
        action: 'Optimize B Products',
        description: 'Solid performers with optimization potential'
      },
      C: {
        title: 'C Products (Low Value)',
        color: 'bg-muted border-muted-foreground',
        icon: AlertCircle,
        action: 'Review C Products',
        description: 'Consider discontinuation or repositioning'
      }
    };

    const config = configs[category];
    const Icon = config.icon;

    return (
      <Card key={category} className={`${config.color} border-2`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Icon className="h-8 w-8" />
            <CardTitle className="text-2xl">{item.skuCount}</CardTitle>
          </div>
          <CardTitle className="text-sm font-semibold">{config.title}</CardTitle>
          <CardDescription className="text-xs">{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Revenue Share</span>
              <span className="font-bold">{item.revenuePercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Margin</span>
              <span className="font-bold">{item.avgMargin.toFixed(1)}%</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2">
              {config.action}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.count} SKUs</p>
          <p className="text-sm">Revenue: {data.value.toFixed(1)}%</p>
          <p className="text-sm">Avg Margin: {data.margin.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* ABC Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {getCardData('A')}
        {getCardData('B')}
        {getCardData('C')}
      </div>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Distribution by Product Category</CardTitle>
          <CardDescription>
            ABC Analysis: Products ranked by revenue contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[data[index].category]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="mt-6 space-y-3 border-t pt-4">
            <h4 className="font-semibold">Key Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Focus on A Products</p>
                  <p className="text-muted-foreground">
                    {data.find(d => d.category === 'A')?.skuCount || 0} products drive {data.find(d => d.category === 'A')?.revenuePercent.toFixed(0)}% of revenue
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-chart-2 mt-0.5" />
                <div>
                  <p className="font-medium">Optimize B Products</p>
                  <p className="text-muted-foreground">
                    Strong performers with potential to become A-tier products
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Review C Products</p>
                  <p className="text-muted-foreground">
                    {data.find(d => d.category === 'C')?.skuCount || 0} products contributing only {data.find(d => d.category === 'C')?.revenuePercent.toFixed(0)}% - consider discontinuation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
