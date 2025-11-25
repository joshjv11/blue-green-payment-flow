import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';

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
    // Skip bills without a category
    if (!bill.category) return acc;

    const category = bill.category.charAt(0).toUpperCase() + bill.category.slice(1);
    if (!acc[category]) {
      acc[category] = { name: category, amount: 0 };
    }
    acc[category].amount += bill.amount;
    return acc;
  }, {} as Record<string, { name: string; amount: number }>);

  const categoryChartData = Object.values(categoryData).sort((a, b) => b.amount - a.amount);

  const totalRevenue = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
  const overdueCount = bills.filter(b => b.status === 'overdue').length;
  const overduePct = bills.length > 0 ? (overdueCount / bills.length) * 100 : 0;
  const avgBillAmount = bills.length > 0 ? bills.reduce((sum, b) => sum + b.amount, 0) / bills.length : 0;

  // Animated counters
  const animatedRevenue = useCountUp({ end: totalRevenue / 1000, duration: 1200, decimals: 1 });
  const animatedOverduePct = useCountUp({ end: overduePct, duration: 1200, decimals: 1 });
  const animatedAvgBill = useCountUp({ end: avgBillAmount, duration: 1200 });

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-4 rounded-xl glass border border-border/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-float",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
            )}
          >
            <DollarSign className={cn(
              "h-5 w-5 mb-2",
              isPro ? "text-[hsl(45,100%,60%)]" : "text-green-500"
            )} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total Revenue</p>
            <p className={cn(
              "text-2xl md:text-3xl font-bold mt-1 tabular-nums",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              ₹{animatedRevenue}k
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-4 rounded-xl glass border border-border/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-float",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
            )}
          >
            <Calendar className="h-5 w-5 mb-2 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Overdue Rate</p>
            <p className="text-2xl md:text-3xl font-bold text-red-500 mt-1 tabular-nums">{animatedOverduePct}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "p-4 rounded-xl glass border border-border/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-float col-span-2 md:col-span-1",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
            )}
          >
            <TrendingUp className={cn(
              "h-5 w-5 mb-2",
              isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
            )} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Avg Bill Amount</p>
            <p className={cn(
              "text-2xl md:text-3xl font-bold mt-1 tabular-nums",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              ₹{animatedAvgBill}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
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
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="unpaidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPro ? "hsl(45, 100%, 60%)" : "hsl(250, 95%, 68%)"} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={isPro ? "hsl(45, 100%, 60%)" : "hsl(250, 95%, 68%)"} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                    stroke="hsl(var(--border))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                    stroke="hsl(var(--border))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backdropFilter: 'blur(12px)',
                      padding: '12px'
                    }}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                  />
                  <Bar dataKey="paid" fill="url(#paidGradient)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="unpaid" fill="url(#unpaidGradient)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="overdue" fill="url(#overdueGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
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
        </motion.div>
      </div>
    </div>
  );
};
