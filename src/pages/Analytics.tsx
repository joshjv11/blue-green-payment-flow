import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { formatINR, formatINRCompact } from '@/utils/currency';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { BarChart3, TrendingUp, DollarSign, Calendar, Crown, Lock, AlertCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays, isBefore, isAfter } from 'date-fns';
import UpgradeModal from '@/components/UpgradeModal';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';

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
      
      // Fetch real bills from Supabase
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('Error fetching bills:', error);
        throw error;
      }

      setBills(data || []);
      console.log(`✅ Analytics: Loaded ${data?.length || 0} bills`);
    } catch (error: any) {
      console.error('❌ Error fetching bills for analytics:', error);
      toast({
        title: "Failed to load analytics",
        description: error.message || "Could not fetch your bills data. Please try again.",
        variant: "destructive",
      });
      // Set empty array on error so UI shows "No bills yet"
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate basic analytics (available to all users)
  const totalAmount = bills.length > 0 ? bills.reduce((sum, bill) => sum + bill.amount, 0) : 0;
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
      <div className="min-h-screen bg-background pb-20 md:pb-0">
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
          {bills.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Bills Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first bill to see analytics and insights
                </p>
                <Button onClick={() => window.location.href = '/bills'}>
                  Add Your First Bill
                </Button>
              </CardContent>
            </Card>
          ) : (
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
                    <p className="text-2xl font-bold">{formatINR(totalAmount)}</p>
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
                    <p className="text-2xl font-bold text-green-600">{formatINR(paidAmount)}</p>
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
                    <p className="text-2xl font-bold text-red-600">{formatINR(unpaidAmount)}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Payment Progress - Only show if there are bills */}
          {bills.length > 0 && (
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
          )}

          {/* Advanced Analytics Section - Pass real bills data */}
          {bills.length > 0 && <AdvancedAnalytics bills={bills} />}
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