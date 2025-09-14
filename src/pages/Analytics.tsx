import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { BarChart3, TrendingUp, DollarSign, Calendar, Crown, Lock, AlertCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays, isBefore, isAfter } from 'date-fns';
import UpgradeModal from '@/components/UpgradeModal';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'unpaid' | 'paid' | 'overdue';
  created_at: string;
}

const Analytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { plan, hasAdvancedAnalytics, aiQueriesUsed, aiQueriesLimit } = useSupabasePlan();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Initialize payment verification
  usePaymentVerification();

  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration - in production this would fetch from Supabase
      const mockBills: Bill[] = [
        {
          id: '1', name: 'Electric Bill', amount: 120, due_date: '2024-01-15',
          category: 'utilities', status: 'paid', created_at: '2024-01-01'
        },
        {
          id: '2', name: 'Internet Bill', amount: 60, due_date: '2024-01-20',
          category: 'utilities', status: 'unpaid', created_at: '2024-01-01'
        },
        {
          id: '3', name: 'Rent', amount: 1200, due_date: '2024-01-01',
          category: 'rent', status: 'paid', created_at: '2023-12-01'
        },
      ];
      setBills(mockBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate basic analytics (available to all users)
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidAmount = bills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const unpaidAmount = bills.filter(bill => bill.status !== 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const overdueBills = bills.filter(bill => bill.status === 'overdue').length;

  // Advanced analytics (Pro only)
  const monthlySpending = hasAdvancedAnalytics ? bills.reduce((acc, bill) => {
    const month = format(parseISO(bill.due_date), 'yyyy-MM');
    acc[month] = (acc[month] || 0) + bill.amount;
    return acc;
  }, {} as Record<string, number>) : {};

  const categoryBreakdown = hasAdvancedAnalytics ? bills.reduce((acc, bill) => {
    acc[bill.category] = (acc[bill.category] || 0) + bill.amount;
    return acc;
  }, {} as Record<string, number>) : {};

  const paymentTrends = hasAdvancedAnalytics ? {
    onTimePayments: bills.filter(bill => {
      if (bill.status !== 'paid') return false;
      const dueDate = parseISO(bill.due_date);
      const today = new Date();
      return !isBefore(today, dueDate);
    }).length,
    latePayments: bills.filter(bill => bill.status === 'overdue').length,
  } : { onTimePayments: 0, latePayments: 0 };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Insights into your financial patterns and bill management</p>
            </div>
            {!hasAdvancedAnalytics && (
              <Button onClick={() => setShowUpgradeModal(true)} className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Unlock Advanced Analytics
              </Button>
            )}
          </div>

          {/* Freemium Limit Card */}
          <FreemiumLimitCard
            type="ai"
            currentCount={aiQueriesUsed}
            onUpgrade={() => setShowUpgradeModal(true)}
          />

          {/* Basic Statistics - Available to All Users */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Bills</p>
                    <p className="text-2xl font-bold">{bills.length}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                    <p className="text-2xl font-bold text-green-600">₹{paidAmount.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                    <p className="text-2xl font-bold text-red-600">₹{unpaidAmount.toFixed(2)}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Paid Bills</span>
                  <span>{Math.round((paidAmount / totalAmount) * 100)}%</span>
                </div>
                <Progress value={(paidAmount / totalAmount) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹{paidAmount} paid</span>
                  <span>₹{unpaidAmount} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Analytics Section - Pro Only */}
          {hasAdvancedAnalytics ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">Advanced Analytics</h2>
                <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">Pro</Badge>
              </div>

              {/* Monthly Spending Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spending Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(monthlySpending).map(([month, amount]) => (
                      <div key={month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{format(parseISO(month + '-01'), 'MMM yyyy')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div 
                              className="h-2 bg-primary rounded-full" 
                              style={{ width: `${(amount / Math.max(...Object.values(monthlySpending))) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono">₹{amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categoryBreakdown).map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div 
                              className="h-2 bg-blue-500 rounded-full" 
                              style={{ width: `${(amount / totalAmount) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono">₹{amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{paymentTrends.onTimePayments}</div>
                      <div className="text-sm text-muted-foreground">On-time Payments</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{paymentTrends.latePayments}</div>
                      <div className="text-sm text-muted-foreground">Late Payments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Locked Advanced Analytics
            <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-dashed">
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Unlock detailed spending trends, category breakdowns, payment performance insights, 
                  and personalized recommendations with Pro plan.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <Badge variant="secondary">Monthly Trends</Badge>
                  <Badge variant="secondary">Category Analysis</Badge>
                  <Badge variant="secondary">Payment Performance</Badge>
                  <Badge variant="secondary">Financial Forecasting</Badge>
                  <Badge variant="secondary">Custom Reports</Badge>
                </div>
                <Button onClick={() => setShowUpgradeModal(true)} size="lg">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro - ₹99/month
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced AI Assistant */}
      <EnhancedAIAssistantV2
        bills={bills}
        context="analytics page - financial insights, spending analysis, trends"
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentBillCount={bills.length}
        aiQueriesUsed={aiQueriesUsed}
        aiQueriesLimit={aiQueriesLimit}
        trigger="general"
      />
    </div>
  );
};

export default Analytics;