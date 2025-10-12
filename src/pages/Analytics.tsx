import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { formatINR, formatINRCompact } from '@/utils/currency';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';
import { logError } from '@/lib/logger';
import { BarChart3, TrendingUp, DollarSign, Calendar, Crown, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays, isBefore, isAfter } from 'date-fns';
import UpgradeModal from '@/components/UpgradeModal';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import { useLoadingWatchdog } from '@/hooks/useLoadingWatchdog';
import { cancelAllQueries, refetchAllQueries } from '@/lib/query';

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

  // Loading watchdog to detect stuck states
  useLoadingWatchdog({
    enabled: true,
    onTimeout: () => {
      console.warn('⚠️ Loading timeout in Analytics page');
    }
  });

  const handleRetryAll = async () => {
    try {
      await cancelAllQueries();
      await refetchAllQueries();
      await fetchBills();
      toast({
        title: 'Refreshed',
        description: 'Analytics data has been reloaded',
      });
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      
      if (!isSupabaseConfigured || !supabase) {
        console.warn('⚠️ Supabase not configured');
        setBills([]);
        return;
      }
      
      // Fetch real bills from Supabase
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('🔴 Analytics fetch error:', error);
        
        // Handle specific Supabase errors
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No bills found yet');
          setBills([]);
          return;
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Please log in again.');
        } else if (error.message?.includes('network')) {
          throw new Error('Network error. Please check your connection.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      setBills(data || []);
      console.log(`✅ Analytics: Loaded ${data?.length || 0} bills`);
    } catch (error: any) {
      console.error('❌ Error fetching bills for analytics:', error);
      
      // Log error for debugging
      await logError(error, 'Analytics', 'fetchBills', {
        userId: user?.id,
      });
      
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
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Sticky Header */}
          <div className="sticky top-[73px] md:top-[73px] z-40 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 md:py-4 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Analytics</h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">Financial insights</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetryAll}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                {!hasAdvancedAnalytics && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Unlock Pro</span>
                  </Button>
                )}
              </div>
            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{bills.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Amount</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold truncate">{formatINRCompact(totalAmount)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Paid</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-green-600 truncate">{formatINRCompact(paidAmount)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-red-600 truncate">{formatINRCompact(unpaidAmount)}</p>
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