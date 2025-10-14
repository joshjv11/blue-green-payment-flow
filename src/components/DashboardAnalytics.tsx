import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface Bill {
  id: string;
  amount: number;
  due_date: string;
  status: 'unpaid' | 'paid' | 'overdue';
  category: string;
}

interface DashboardAnalyticsProps {
  bills: Bill[];
  isPro?: boolean;
}

export const DashboardAnalytics = ({ bills, isPro = false }: DashboardAnalyticsProps) => {
  // Monthly revenue data
  const monthlyData = bills.reduce((acc, bill) => {
    const date = new Date(bill.due_date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, paid: 0, unpaid: 0, overdue: 0 };
    }
    
    if (bill.status === 'paid') acc[monthKey].paid += bill.amount;
    else if (bill.status === 'overdue') acc[monthKey].overdue += bill.amount;
    else acc[monthKey].unpaid += bill.amount;
    
    return acc;
  }, {} as Record<string, { month: string; paid: number; unpaid: number; overdue: number }>);

  const monthlyChartData = Object.values(monthlyData).slice(-6);

  // Status distribution
  const statusData = [
    { name: 'Paid', value: bills.filter(b => b.status === 'paid').length, color: 'hsl(142, 76%, 36%)' },
    { name: 'Unpaid', value: bills.filter(b => b.status === 'unpaid').length, color: 'hsl(250, 95%, 68%)' },
    { name: 'Overdue', value: bills.filter(b => b.status === 'overdue').length, color: 'hsl(0, 84%, 60%)' },
  ];

  // Category breakdown
  const categoryData = bills.reduce((acc, bill) => {
    const category = bill.category.charAt(0).toUpperCase() + bill.category.slice(1);
    if (!acc[category]) {
      acc[category] = { name: category, amount: 0 };
    }
    acc[category].amount += bill.amount;
    return acc;
  }, {} as Record<string, { name: string; amount: number }>);

  const categoryChartData = Object.values(categoryData).sort((a, b) => b.amount - a.amount);

  const totalRevenue = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
  const overduePct = bills.length > 0 ? ((bills.filter(b => b.status === 'overdue').length / bills.length) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Analytics Header */}
      <div className={cn(
        "p-4 md:p-6 rounded-2xl glass border border-border/50 shadow-glass transition-all duration-300",
        isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong"
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "p-3 rounded-xl",
            isPro 
              ? "bg-gradient-to-br from-[hsl(45,100%,60%)]/20 to-[hsl(35,100%,55%)]/10"
              : "bg-primary/10"
          )}>
            <TrendingUp className={cn(
              "h-6 w-6",
              isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
            )} />
          </div>
          <div>
            <h2 className={cn(
              "text-xl md:text-2xl font-bold transition-colors duration-300",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              Financial Analytics
            </h2>
            <p className="text-sm text-muted-foreground">Last 6 months overview</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className={cn(
            "p-4 rounded-xl glass border border-border/50 transition-all duration-300 hover:scale-[1.02]",
            isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
          )}>
            <DollarSign className={cn(
              "h-5 w-5 mb-2",
              isPro ? "text-[hsl(45,100%,60%)]" : "text-green-500"
            )} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              ₹{(totalRevenue / 1000).toFixed(1)}k
            </p>
          </div>
          
          <div className={cn(
            "p-4 rounded-xl glass border border-border/50 transition-all duration-300 hover:scale-[1.02]",
            isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
          )}>
            <Calendar className="h-5 w-5 mb-2 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Overdue Rate</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{overduePct}%</p>
          </div>

          <div className={cn(
            "p-4 rounded-xl glass border border-border/50 transition-all duration-300 hover:scale-[1.02] col-span-2 md:col-span-1",
            isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
          )}>
            <TrendingUp className={cn(
              "h-5 w-5 mb-2",
              isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
            )} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Bill Amount</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              ₹{bills.length > 0 ? Math.round(bills.reduce((sum, b) => sum + b.amount, 0) / bills.length) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <Card className={cn(
          "glass border-border/50 shadow-glass transition-all duration-300 hover:shadow-float",
          isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "text-base transition-colors duration-300",
              isPro && "pro-gradient-text"
            )}>
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="paid" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unpaid" fill={isPro ? "hsl(45, 100%, 60%)" : "hsl(250, 95%, 68%)"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className={cn(
          "glass border-border/50 shadow-glass transition-all duration-300 hover:shadow-float",
          isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "text-base transition-colors duration-300",
              isPro && "pro-gradient-text"
            )}>
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
