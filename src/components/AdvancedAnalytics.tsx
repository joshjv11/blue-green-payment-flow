import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, Target, Zap } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { parseISO, format, addMonths, differenceInDays, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';

const AdvancedAnalytics = () => {
  const { plan } = useSupabasePlan();

  // Mock bills data for now - in production this would come from props or Supabase
  const bills = [
    {
      id: '1', name: 'Electric Bill', amount: 120, due_date: '2024-01-15',
      category: 'utilities', status: 'paid' as const, created_at: '2024-01-01', updated_at: '2024-01-05',
      user_id: '1', recurring: true, notes: null
    },
    {
      id: '2', name: 'Internet Bill', amount: 60, due_date: '2024-01-20',
      category: 'utilities', status: 'unpaid' as const, created_at: '2024-01-01', updated_at: '2024-01-01',
      user_id: '1', recurring: true, notes: null
    },
    {
      id: '4', name: 'Phone Bill', amount: 80, due_date: '2023-12-20',
      category: 'utilities', status: 'overdue' as const, created_at: '2023-12-01', updated_at: '2023-12-01',
      user_id: '1', recurring: true, notes: null
    },
    {
      id: '3', name: 'Rent', amount: 1200, due_date: '2024-01-01',
      category: 'rent', status: 'paid' as const, created_at: '2023-12-01', updated_at: '2023-12-25',
      user_id: '1', recurring: true, notes: null
    },
  ];

  // Expense Forecasting - predict next 6 months based on recurring bills
  const expenseForecast = useMemo(() => {
    const recurringBills = bills.filter(bill => bill.recurring);
    const currentDate = new Date();
    
    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = addMonths(currentDate, index);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      // Calculate recurring expenses for this month
      const recurringExpenses = recurringBills.reduce((sum, bill) => {
        // Assume monthly recurring for simplicity
        return sum + bill.amount;
      }, 0);
      
      // Add historical average for non-recurring bills
      const historicalNonRecurring = bills
        .filter(bill => !bill.recurring && bill.status === 'paid')
        .reduce((sum, bill) => sum + bill.amount, 0) / Math.max(bills.length, 1) * 30; // Average per month
      
      return {
        month: format(monthDate, 'MMM yyyy'),
        projected: Number((recurringExpenses + historicalNonRecurring).toFixed(2)),
        recurring: Number(recurringExpenses.toFixed(2)),
        estimated: Number(historicalNonRecurring.toFixed(2))
      };
    });
  }, [bills]);

  // Late Fee Predictions - identify bills likely to incur late fees
  const lateFeeAnalysis = useMemo(() => {
    const today = new Date();
    const upcomingBills = bills.filter(bill => 
      bill.status === 'unpaid' && 
      parseISO(bill.due_date) > today
    );

    const riskAnalysis = upcomingBills.map(bill => {
      const dueDate = parseISO(bill.due_date);
      const daysUntilDue = differenceInDays(dueDate, today);
      
      // Calculate risk based on days until due and historical patterns
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let riskScore = 0;
      
      if (daysUntilDue <= 3) {
        riskLevel = 'high';
        riskScore = 90;
      } else if (daysUntilDue <= 7) {
        riskLevel = 'medium';
        riskScore = 60;
      } else {
        riskLevel = 'low';
        riskScore = 20;
      }
      
      // Estimated late fee (assume 5% of bill amount or ₹25, whichever is higher)
      const estimatedLateFee = Math.max(bill.amount * 0.05, 25);
      
      return {
        ...bill,
        daysUntilDue,
        riskLevel,
        riskScore,
        estimatedLateFee: Number(estimatedLateFee.toFixed(2))
      };
    });

    return riskAnalysis.sort((a, b) => b.riskScore - a.riskScore);
  }, [bills]);

  // Payment Trends - analyze payment patterns over time
  const paymentTrends = useMemo(() => {
    const paidBills = bills.filter(bill => bill.status === 'paid');
    const last6Months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = subMonths(new Date(), index);
      return monthDate;
    }).reverse();

    return last6Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthBills = paidBills.filter(bill => {
        const billDate = parseISO(bill.updated_at);
        return billDate >= monthStart && billDate <= monthEnd;
      });
      
      const totalAmount = monthBills.reduce((sum, bill) => sum + bill.amount, 0);
      const onTimeBills = monthBills.filter(bill => {
        const dueDate = parseISO(bill.due_date);
        const paidDate = parseISO(bill.updated_at);
        return paidDate <= dueDate;
      }).length;
      
      const onTimeRate = monthBills.length > 0 ? (onTimeBills / monthBills.length) * 100 : 0;
      
      return {
        month: format(monthDate, 'MMM'),
        totalAmount: Number(totalAmount.toFixed(2)),
        billCount: monthBills.length,
        onTimeRate: Number(onTimeRate.toFixed(1))
      };
    });
  }, [bills]);

  // Spending Categories Analysis
  const categoryAnalysis = useMemo(() => {
    const categoryTotals = bills
      .filter(bill => bill.status === 'paid')
      .reduce((acc, bill) => {
        acc[bill.category] = (acc[bill.category] || 0) + bill.amount;
        return acc;
      }, {} as Record<string, number>);

    const categoryLabels = {
      utilities: 'Utilities',
      rent: 'Rent',
      insurance: 'Insurance',
      subscription: 'Subscriptions',
      loan: 'Loans',
      credit_card: 'Credit Cards',
      other: 'Other'
    };

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category: categoryLabels[category as keyof typeof categoryLabels] || category,
        amount: Number(amount.toFixed(2)),
        percentage: Number(((amount / Object.values(categoryTotals).reduce((a, b) => a + b, 0)) * 100).toFixed(1))
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [bills]);

  // Financial Health Metrics
  const healthMetrics = useMemo(() => {
    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.status === 'paid').length;
    const overdueBills = bills.filter(b => b.status === 'overdue').length;
    const upcomingBills = bills.filter(b => {
      const dueDate = parseISO(b.due_date);
      const today = new Date();
      const daysUntilDue = differenceInDays(dueDate, today);
      return b.status === 'unpaid' && daysUntilDue <= 30 && daysUntilDue >= 0;
    }).length;

    const paymentConsistency = totalBills > 0 ? (paidBills / totalBills) * 100 : 0;
    const overdueRate = totalBills > 0 ? (overdueBills / totalBills) * 100 : 0;
    
    // Calculate total potential late fees
    const potentialLateFees = lateFeeAnalysis
      .filter(bill => bill.riskLevel === 'high')
      .reduce((sum, bill) => sum + bill.estimatedLateFee, 0);

    return {
      paymentConsistency: Number(paymentConsistency.toFixed(1)),
      overdueRate: Number(overdueRate.toFixed(1)),
      upcomingBills,
      potentialLateFees: Number(potentialLateFees.toFixed(2)),
      totalBills,
      paidBills,
      overdueBills
    };
  }, [bills, lateFeeAnalysis]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  // Show Pro upgrade message for free users
  if (plan === 'free') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Analytics</h2>
          <p className="text-muted-foreground">Unlock detailed financial insights and forecasting</p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upgrade to Pro for Advanced Analytics</h3>
            <p className="text-muted-foreground mb-6">
              Get expense forecasting, late fee predictions, detailed payment trends, and personalized financial insights.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-background rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="font-medium">Expense Forecasting</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <AlertTriangle className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="font-medium">Late Fee Predictions</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <Target className="h-6 w-6 text-primary mb-2 mx-auto" />
                <p className="font-medium">Payment Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Analytics</h2>
        <p className="text-muted-foreground">Comprehensive financial insights and forecasting</p>
      </div>

      {/* Financial Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Rate</p>
                <p className="text-2xl font-bold text-green-600">{healthMetrics.paymentConsistency}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Rate</p>
                <p className="text-2xl font-bold text-red-600">{healthMetrics.overdueRate}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Bills</p>
                <p className="text-2xl font-bold text-blue-600">{healthMetrics.upcomingBills}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Potential Late Fees</p>
                <p className="text-2xl font-bold text-orange-600">₹{healthMetrics.potentialLateFees}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            6-Month Expense Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              projected: { label: "Projected Total", color: "hsl(var(--primary))" },
              recurring: { label: "Recurring Bills", color: "hsl(var(--secondary))" },
              estimated: { label: "Estimated Variable", color: "hsl(var(--muted))" }
            }}
            className="h-[300px]"
          >
            <BarChart data={expenseForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="recurring" stackId="a" fill="var(--color-recurring)" />
              <Bar dataKey="estimated" stackId="a" fill="var(--color-estimated)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Payment Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                totalAmount: { label: "Total Amount", color: "hsl(var(--primary))" },
                onTimeRate: { label: "On-Time Rate", color: "hsl(var(--secondary))" }
              }}
              className="h-[250px]"
            >
              <LineChart data={paymentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line yAxisId="left" type="monotone" dataKey="totalAmount" stroke="var(--color-totalAmount)" />
                <Line yAxisId="right" type="monotone" dataKey="onTimeRate" stroke="var(--color-onTimeRate)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryAnalysis.slice(0, 5).map((category, index) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.category}</span>
                    <span className="text-sm text-muted-foreground">
                      ₹{category.amount} ({category.percentage}%)
                    </span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Late Fee Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Late Fee Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lateFeeAnalysis.length > 0 ? (
            <div className="space-y-4">
              {lateFeeAnalysis.slice(0, 10).map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{bill.name}</h4>
                      <Badge className={getRiskColor(bill.riskLevel)}>
                        {bill.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(parseISO(bill.due_date), 'MMM dd, yyyy')} 
                      ({bill.daysUntilDue} days remaining)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹{bill.amount}</div>
                    <div className="text-sm text-red-600">
                      Est. Late Fee: ₹{bill.estimatedLateFee}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Risk Detected</h3>
              <p className="text-muted-foreground">All your bills are on track with no late fee risks.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAnalytics;