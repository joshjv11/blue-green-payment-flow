import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CashFlowData, formatCurrency, isNegative } from '@/utils/financialCalculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface CashFlowStatementProps {
  data: CashFlowData;
  loading: boolean;
}

export const CashFlowStatement = ({ data, loading }: CashFlowStatementProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Statement</CardTitle>
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
    { 
      name: 'Operating', 
      value: data.operating.net,
      color: data.operating.net >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'
    },
    { 
      name: 'Investing', 
      value: data.investing.net,
      color: data.investing.net >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'
    },
    { 
      name: 'Financing', 
      value: data.financing.net,
      color: data.financing.net >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Cash Flow Statement</CardTitle>
          <CardDescription>Cash inflows and outflows by activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {isNegative(data.netCashFlow) ? (
                  <ArrowDownCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <ArrowUpCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Net Cash Flow</p>
              <p className={`text-3xl font-bold ${isNegative(data.netCashFlow) ? 'text-red-600' : 'text-green-600'}`}>
                {isNegative(data.netCashFlow) && '-'}
                {formatCurrency(data.netCashFlow)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow by Activity</CardTitle>
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
            {/* Operating Activities */}
            <div>
              <p className="font-semibold text-lg mb-3">Operating Activities</p>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Cash from Sales</span>
                  <span className="text-green-600">{formatCurrency(data.operating.salesReceipts)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Cash for Purchases</span>
                  <span className="text-red-600">({formatCurrency(data.operating.purchasePayments)})</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Cash for Expenses</span>
                  <span className="text-red-600">({formatCurrency(data.operating.expensePayments)})</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-border mt-2">
                <span className="font-semibold">Net Operating Cash Flow</span>
                <span className={`font-semibold ${isNegative(data.operating.net) ? 'text-red-600' : 'text-green-600'}`}>
                  {isNegative(data.operating.net) && '-'}
                  {formatCurrency(data.operating.net)}
                </span>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <p className="font-semibold text-lg mb-3">Investing Activities</p>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Inventory Purchases</span>
                  <span className="text-red-600">({formatCurrency(data.investing.inventoryPurchases)})</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-border mt-2">
                <span className="font-semibold">Net Investing Cash Flow</span>
                <span className={`font-semibold ${isNegative(data.investing.net) ? 'text-red-600' : 'text-green-600'}`}>
                  {isNegative(data.investing.net) && '-'}
                  {formatCurrency(data.investing.net)}
                </span>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <p className="font-semibold text-lg mb-3">Financing Activities</p>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Equity Contributions</span>
                  <span>{formatCurrency(data.financing.equity)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-border mt-2">
                <span className="font-semibold">Net Financing Cash Flow</span>
                <span className={`font-semibold ${isNegative(data.financing.net) ? 'text-red-600' : 'text-green-600'}`}>
                  {isNegative(data.financing.net) && '-'}
                  {formatCurrency(data.financing.net)}
                </span>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">Net Increase in Cash</span>
                <span className={`font-bold text-xl ${isNegative(data.netCashFlow) ? 'text-red-600' : 'text-green-600'}`}>
                  {isNegative(data.netCashFlow) && '-'}
                  {formatCurrency(data.netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
