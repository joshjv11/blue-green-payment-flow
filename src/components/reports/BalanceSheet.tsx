import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BalanceSheetData, formatCurrency } from '@/utils/financialCalculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BalanceSheetProps {
  data: BalanceSheetData;
  loading: boolean;
}

const COLORS = {
  inventory: 'hsl(210, 100%, 60%)',
  receivables: 'hsl(142, 71%, 45%)',
  payables: 'hsl(0, 84%, 60%)',
  equity: 'hsl(271, 81%, 56%)'
};

export const BalanceSheet = ({ data, loading }: BalanceSheetProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
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

  const assetPieData = [
    { name: 'Inventory', value: data.assets.inventory, color: COLORS.inventory },
    { name: 'Receivables', value: data.assets.receivables, color: COLORS.receivables }
  ].filter(item => item.value > 0);

  const isBalanced = Math.abs(data.assets.total - (data.liabilities.total + data.equity.total)) < 0.01;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Balance Sheet</CardTitle>
          <CardDescription>Assets, liabilities, and equity snapshot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.assets.total)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data.liabilities.total)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Equity</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.equity.total)}</p>
            </div>
          </div>
          
          {isBalanced ? (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">✓ Balance Sheet is balanced</p>
              <p className="text-xs text-green-700 mt-1">
                Assets = Liabilities + Equity
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">⚠ Balance Sheet has minor discrepancy</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Distribution Chart */}
      {assetPieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Inventory</span>
                  <span className="font-medium">{formatCurrency(data.assets.inventory)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Accounts Receivable</span>
                  <span className="font-medium">{formatCurrency(data.assets.receivables)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-t-2 border-border">
                <span className="font-bold text-lg">Total Assets</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(data.assets.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card>
          <CardHeader>
            <CardTitle>Liabilities & Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Liabilities */}
              <div>
                <p className="font-semibold mb-2">Liabilities</p>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Accounts Payable</span>
                    <span className="font-medium">{formatCurrency(data.liabilities.payables)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-t mt-2">
                  <span className="font-medium">Total Liabilities</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(data.liabilities.total)}
                  </span>
                </div>
              </div>

              {/* Equity */}
              <div>
                <p className="font-semibold mb-2">Equity</p>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Retained Earnings</span>
                    <span className="font-medium">{formatCurrency(data.equity.retainedEarnings)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-t mt-2">
                  <span className="font-medium">Total Equity</span>
                  <span className="font-medium text-purple-600">
                    {formatCurrency(data.equity.total)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-t-2 border-border">
                <span className="font-bold text-lg">Total L + E</span>
                <span className="font-bold text-lg">
                  {formatCurrency(data.liabilities.total + data.equity.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
