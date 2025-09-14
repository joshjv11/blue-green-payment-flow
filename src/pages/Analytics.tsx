import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LogOut, BarChart3, PieChart as PieChartIcon, TrendingUp, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseISO, format, isBefore, isAfter, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const categoryColors = {
  utilities: '#8884d8',
  rent: '#82ca9d',
  insurance: '#ffc658',
  subscription: '#ff7300',
  loan: '#00ff88',
  credit_card: '#ff0080',
  other: '#8dd1e1'
};

const categoryLabels = {
  utilities: 'Utilities',
  rent: 'Rent',
  insurance: 'Insurance',
  subscription: 'Subscriptions',
  loan: 'Loans',
  credit_card: 'Credit Cards',
  other: 'Other'
};

const Analytics = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [localBills] = useLocalStorage<Bill[]>(`bills_${user?.id}`, []);

  // Get paid bills for analytics
  const paidBills = useMemo(() => 
    localBills.filter(bill => bill.status === 'paid'), 
    [localBills]
  );

  // Monthly spending breakdown by category
  const monthlySpending = useMemo(() => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthlyPaidBills = paidBills.filter(bill => {
      const dueDate = parseISO(bill.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });

    const categoryTotals = monthlyPaidBills.reduce((acc, bill) => {
      acc[bill.category] = (acc[bill.category] || 0) + bill.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category: categoryLabels[category as keyof typeof categoryLabels],
      amount: Number(amount.toFixed(2)),
      fill: categoryColors[category as keyof typeof categoryColors]
    }));
  }, [paidBills]);

  // On-time payment analysis
  const paymentAnalysis = useMemo(() => {
    const completedBills = localBills.filter(bill => 
      bill.status === 'paid' || bill.status === 'overdue'
    );

    const onTimeBills = completedBills.filter(bill => {
      if (bill.status === 'overdue') return false;
      
      // Assume bills paid within the due date are on-time
      const dueDate = parseISO(bill.due_date);
      const updatedDate = parseISO(bill.updated_at);
      return updatedDate <= dueDate;
    });

    const onTimeRate = completedBills.length > 0 
      ? Math.round((onTimeBills.length / completedBills.length) * 100)
      : 0;

    return {
      total: completedBills.length,
      onTime: onTimeBills.length,
      late: completedBills.length - onTimeBills.length,
      onTimeRate
    };
  }, [localBills]);

  // Last 10 payments
  const recentPayments = useMemo(() => {
    return paidBills
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
  }, [paidBills]);

  // Financial Health Score calculation
  const healthScore = useMemo(() => {
    let score = 0;
    const maxScore = 100;

    // On-time payment rate (50% of score)
    score += (paymentAnalysis.onTimeRate * 0.5);

    // Number of active bills vs overdue bills (30% of score)
    const activeBills = localBills.filter(bill => bill.status !== 'paid').length;
    const overdueBills = localBills.filter(bill => bill.status === 'overdue').length;
    
    if (activeBills > 0) {
      const overdueRatio = overdueBills / activeBills;
      score += ((1 - overdueRatio) * 30);
    } else {
      score += 30; // No active bills is good
    }

    // Consistency (20% of score) - based on having bills in different categories
    const categoriesUsed = new Set(localBills.map(bill => bill.category)).size;
    const maxCategories = Object.keys(categoryLabels).length;
    score += (categoriesUsed / maxCategories) * 20;

    return Math.min(Math.round(score), maxScore);
  }, [localBills, paymentAnalysis.onTimeRate]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const totalMonthlySpending = monthlySpending.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="text-xl font-bold text-foreground">InvoiceFlow</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/bills')}
              >
                Bills
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Financial Analytics
            </h1>
            <p className="text-muted-foreground">
              Track your spending patterns and payment performance
            </p>
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${totalMonthlySpending.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Spending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {paymentAnalysis.onTimeRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">On-Time Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {paidBills.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Payments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={`shadow-soft ${getHealthScoreBg(healthScore)}`}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`h-8 w-8 ${getHealthScoreColor(healthScore)}`} />
                  <div>
                    <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
                      {healthScore}
                    </div>
                    <div className="text-sm text-muted-foreground">Health Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Monthly Spending Bar Chart */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>Monthly Spending by Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlySpending.length > 0 ? (
                  <ChartContainer
                    config={{
                      amount: {
                        label: "Amount",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={monthlySpending}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No payment data available for this month
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Pie Chart */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  <span>Spending Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlySpending.length > 0 ? (
                  <ChartContainer
                    config={{
                      amount: {
                        label: "Amount",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={monthlySpending}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="amount"
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      >
                        {monthlySpending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No payment data available for this month
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Performance and Recent Payments */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Payment Performance */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Payment Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">On-Time Payments</span>
                    <Badge className="bg-green-100 text-green-800">
                      {paymentAnalysis.onTime} bills
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Late Payments</span>
                    <Badge className="bg-red-100 text-red-800">
                      {paymentAnalysis.late} bills
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>On-Time Rate</span>
                      <span className="font-medium">{paymentAnalysis.onTimeRate}%</span>
                    </div>
                    <Progress value={paymentAnalysis.onTimeRate} className="h-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Financial Health Score</span>
                    <span className={`font-medium ${getHealthScoreColor(healthScore)}`}>
                      {healthScore}/100
                    </span>
                  </div>
                  <Progress value={healthScore} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    Based on payment history, bill management, and financial diversity
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {recentPayments.length > 0 ? (
                  <div className="space-y-3">
                    {recentPayments.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{bill.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(bill.updated_at), 'MMM dd, yyyy')} • {categoryLabels[bill.category as keyof typeof categoryLabels]}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-foreground">${bill.amount.toFixed(2)}</div>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Paid
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No payments yet</h3>
                    <p className="text-muted-foreground mb-4">Mark some bills as paid to see your payment history</p>
                    <Button onClick={() => navigate('/bills')}>
                      Go to Bills
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;