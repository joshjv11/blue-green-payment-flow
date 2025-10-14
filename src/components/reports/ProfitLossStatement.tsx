import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfitLossData, formatCurrency, isNegative } from '@/utils/financialCalculations';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProfitLossStatementProps {
  data: ProfitLossData;
  loading: boolean;
}

export const ProfitLossStatement = ({ data, loading }: ProfitLossStatementProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Revenue', value: data.revenue, color: 'hsl(142, 71%, 45%)' },
    { name: 'COGS', value: data.cogs, color: 'hsl(0, 84%, 60%)' },
    { name: 'Expenses', value: data.operatingExpenses.total, color: 'hsl(24, 95%, 53%)' },
    { name: 'Net Profit', value: data.netProfit, color: data.netProfit >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)' }
  ];

  const profitMargin = data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
          <CardDescription>Income, expenses, and profitability analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.revenue)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.cogs + data.operatingExpenses.total)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${isNegative(data.netProfit) ? 'text-red-600' : 'text-green-600'}`}>
                  {isNegative(data.netProfit) && '-'}
                  {formatCurrency(data.netProfit)}
                </p>
                {isNegative(data.netProfit) ? (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Margin: {profitMargin}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue */}
            <div>
              <div className="flex justify-between items-center py-3 border-b-2 border-border">
                <span className="font-semibold text-lg">Revenue</span>
                <span className="font-bold text-lg">{formatCurrency(data.revenue)}</span>
              </div>
            </div>

            {/* COGS */}
            <div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Less: Cost of Goods Sold</span>
                <span className="text-red-600">({formatCurrency(data.cogs)})</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="font-semibold">Gross Profit</span>
                <span className="font-semibold">{formatCurrency(data.grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <p className="font-semibold mb-2">Operating Expenses</p>
              {Object.entries(data.operatingExpenses.byCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center py-2 pl-4">
                  <span className="text-muted-foreground">{category}</span>
                  <span className="text-red-600">({formatCurrency(amount)})</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 pl-4 border-t">
                <span className="font-medium">Total Operating Expenses</span>
                <span className="font-medium text-red-600">
                  ({formatCurrency(data.operatingExpenses.total)})
                </span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">Net Profit</span>
                <span className={`font-bold text-xl ${isNegative(data.netProfit) ? 'text-red-600' : 'text-green-600'}`}>
                  {isNegative(data.netProfit) && '-'}
                  {formatCurrency(data.netProfit)}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Profit Margin: {profitMargin}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
