import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryMargin } from '@/hooks/useProfitabilityData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  data: CategoryMargin[];
}

export function CategoryMarginChart({ data }: Props) {
  const getBarColor = (margin: number) => {
    if (margin > 30) return 'hsl(var(--chart-1))'; // Green
    if (margin > 15) return 'hsl(var(--chart-3))'; // Yellow
    return 'hsl(var(--destructive))'; // Red
  };

  const chartData = data.map(item => ({
    category: item.category,
    avgMargin: item.avgMargin,
    minMargin: item.minMargin,
    maxMargin: item.maxMargin,
    productCount: item.productCount,
    range: item.maxMargin - item.minMargin
  }));

  const highestMargin = data.reduce((max, item) => 
    item.avgMargin > max.avgMargin ? item : max
  , data[0]);

  const lowestMargin = data.reduce((min, item) => 
    item.avgMargin < min.avgMargin ? item : min
  , data[0]);

  const mostConsistent = data.reduce((min, item) => {
    const range = item.maxMargin - item.minMargin;
    const minRange = min.maxMargin - min.minMargin;
    return range < minRange ? item : min;
  }, data[0]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.category}</p>
          <p className="text-sm">Products: {data.productCount}</p>
          <p className="text-sm">Avg Margin: {data.avgMargin.toFixed(1)}%</p>
          <p className="text-sm">Range: {data.minMargin.toFixed(1)}% - {data.maxMargin.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Margin by Category</CardTitle>
        <CardDescription>
          Average margin distribution across product categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                label={{ value: 'Profit Margin (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgMargin" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.avgMargin)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="mt-6 space-y-3 border-t pt-4">
          <h4 className="font-semibold">Category Insights</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Highest Margin</p>
                <p className="text-lg font-bold">{highestMargin.category}</p>
                <p className="text-sm text-muted-foreground">{highestMargin.avgMargin.toFixed(1)}% avg margin</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Focus marketing and inventory on this category
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Lowest Margin</p>
                <p className="text-lg font-bold">{lowestMargin.category}</p>
                <p className="text-sm text-muted-foreground">{lowestMargin.avgMargin.toFixed(1)}% avg margin</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review pricing or reduce costs
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10">
              <Minus className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Most Consistent</p>
                <p className="text-lg font-bold">{mostConsistent.category}</p>
                <p className="text-sm text-muted-foreground">
                  {mostConsistent.minMargin.toFixed(1)}% - {mostConsistent.maxMargin.toFixed(1)}% range
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Predictable profitability
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
