import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Expense } from '@/pages/Expenses';

interface ExpenseChartProps {
  expenses: Expense[];
}

const COLORS = [
  'hsl(210, 100%, 60%)',  // Blue
  'hsl(142, 71%, 45%)',   // Green
  'hsl(271, 81%, 56%)',   // Purple
  'hsl(330, 81%, 60%)',   // Pink
  'hsl(239, 84%, 67%)',   // Indigo
  'hsl(24, 95%, 53%)',    // Orange
  'hsl(173, 80%, 40%)',   // Teal
  'hsl(0, 0%, 50%)',      // Gray
];

export const ExpenseChart = ({ expenses }: ExpenseChartProps) => {
  // Aggregate expenses by category
  const categoryData = expenses.reduce((acc, expense) => {
    const existing = acc.find(item => item.name === expense.category);
    const amount = Number(expense.amount);
    
    if (existing) {
      existing.value += amount;
    } else {
      acc.push({
        name: expense.category,
        value: amount,
      });
    }
    
    return acc;
  }, [] as { name: string; value: number }[]);

  // Sort by value descending
  categoryData.sort((a, b) => b.value - a.value);

  if (categoryData.length === 0) {
    return null;
  }

  const total = categoryData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            ₹{data.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Distribution</CardTitle>
        <CardDescription>Breakdown by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => 
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Category Breakdown */}
        <div className="mt-6 space-y-2">
          {categoryData.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{percentage}%</span>
                  <span className="font-semibold">
                    ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
