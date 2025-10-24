import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatINRCompact } from '@/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotifications } from '@/hooks/useNotifications';
import { useEmailReminders } from '@/hooks/useEmailReminders';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Building, Mail, FileText, ArrowRight, Plus, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, BarChart3, Settings, Download, Upload, Crown, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseISO, differenceInDays, isBefore, isToday, isAfter, addDays, format } from 'date-fns';
import ExportImport from '@/components/ExportImport';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { Navigation } from '@/components/Navigation';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import UpgradeModal from '@/components/UpgradeModal';
import AddPasskeyBanner from '@/components/auth/AddPasskeyBanner';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLoadingWatchdog } from '@/hooks/useLoadingWatchdog';
import { cancelAllQueries, refetchAllQueries } from '@/lib/query';
import { usePlan } from '@/contexts/PlanContext';
import { cn } from '@/lib/utils';
import { StatCardWithSparkline } from '@/components/StatCardWithSparkline';
import { DashboardAnalytics } from '@/components/DashboardAnalytics';
import { FloatingActionButtons } from '@/components/FloatingActionButtons';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import { RewardProgressBar } from '@/components/RewardProgressBar';
import { CelebrationAnimation } from '@/components/CelebrationAnimation';
import { MotivationalBanner } from '@/components/MotivationalBanner';
import { TierBadge } from '@/components/TierBadge';
import { useRewards } from '@/hooks/useRewards';
import { MobileLayout } from '@/components/MobileLayout';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { DailyBonusWheel } from '@/components/DailyBonusWheel';
import { useStreakProtection } from '@/hooks/useStreakProtection';
import { StreakCountdownBanner } from '@/components/StreakCountdownBanner';
import { StreakShieldShop } from '@/components/StreakShieldShop';
import { useEntitlements } from '@/lib/useEntitlements';
import * as analytics from '@/lib/analytics';
import { DashboardKPIs } from '@/components/analytics/DashboardKPIs';
import { MonthlyChart } from '@/components/analytics/MonthlyChart';
import { TopLists } from '@/components/analytics/TopLists';
import { InventoryValueCard } from '@/components/analytics/InventoryValueCard';
import { UpcomingBills } from '@/components/analytics/UpcomingBills';

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

const Dashboard = () => {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { plan: contextPlan } = usePlan();
  const isPro = contextPlan === 'pro';
  const { plan, aiQueriesUsed, aiQueriesLimit, loading: planLoading } = useSupabasePlan();
  const { rewards, badges, loading: rewardsLoading, awardXP, updateStreak, checkAndAwardMilestoneBadges } = useRewards();
  const { canClaim: canClaimBonus, claimDailyBonus, loading: bonusLoading } = useDailyBonus();
  const { 
    timeUntilExpiry, 
    formatTimeRemaining, 
    isStreakInDanger, 
    isCritical, 
    getShieldCounts,
    useShield,
    purchaseShield
  } = useStreakProtection();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);
  const [showBonusWheel, setShowBonusWheel] = useState(false);
  const [showShieldShop, setShowShieldShop] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [localBills, setLocalBills] = useLocalStorage<Bill[]>(`bills_${user?.id}`, []);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPasskeyBanner, setShowPasskeyBanner] = useState(false);
  const { billLimit, canAddBill, canMakeAIQuery, getAIQueriesRemaining } = useSupabasePlan();
  const { isPremium, loading: entitlementsLoading } = useEntitlements();
  
  // Premium Analytics State
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<analytics.DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<analytics.MonthlyAggregate[]>([]);
  const [topCustomers, setTopCustomers] = useState<analytics.TopCustomer[]>([]);
  const [topVendors, setTopVendors] = useState<analytics.TopVendor[]>([]);
  const [upcomingBillsData, setUpcomingBillsData] = useState<analytics.UpcomingBill[]>([]);
  const [inventoryValue, setInventoryValue] = useState<analytics.InventoryValue | null>(null);
  
  // Initialize notifications, email reminders, and payment verification
  useNotifications();
  useEmailReminders();
  usePaymentVerification();

  // Loading watchdog to detect stuck states
  useLoadingWatchdog({
    enabled: true,
    onTimeout: () => {
      console.warn('⚠️ Loading timeout in Dashboard page');
    }
  });

  const handleRetryAll = async () => {
    try {
      await cancelAllQueries();
      await refetchAllQueries();
      await fetchProfile();
      await fetchBills();
      await fetchAnalytics();
      toast({
        title: 'Refreshed',
        description: 'Dashboard data has been reloaded',
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
      fetchProfile();
      fetchBills();
      fetchAnalytics(); // Fetch premium analytics
      
      // Check if we should show the passkey banner
      const checkPasskeySupport = async () => {
        if (window.PublicKeyCredential && 
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() &&
            !localStorage.getItem('invoiceflow_has_passkey') &&
            !localStorage.getItem('invoiceflow_passkey_banner_dismissed')) {
          setShowPasskeyBanner(true);
        }
      };

      checkPasskeySupport();
      track('dashboard_viewed', { user_id: user?.id });
      
      // Show daily bonus with unpredictable timing
      if (canClaimBonus && !showBonusWheel) {
        const delay = Math.random() * 5000; // 0-5 seconds
        const timer = setTimeout(() => {
          setShowBonusWheel(true);
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [user, track, canClaimBonus]);

  const fetchProfile = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFullName(data.full_name || '');
        setCompany(data.company || '');
      } else {
        // localStorage mode - get user data from the user object
        const userData = {
          id: user!.id,
          email: user!.email,
          full_name: (user as any).full_name || null,
          company: (user as any).company || null,
        };
        setProfile(userData);
        setFullName(userData.full_name || '');
        setCompany(userData.company || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBills = async () => {
    try {
      setBillsLoading(true);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user!.id)
          .order('due_date', { ascending: true });

        if (error) throw error;

        // Auto-update overdue bills
        const updatedBills = data.map(bill => {
          const today = new Date();
          const dueDate = parseISO(bill.due_date);
          
          if (bill.status === 'unpaid' && isBefore(dueDate, today)) {
            return { ...bill, status: 'overdue' as const };
          }
          return bill;
        });

        setBills(updatedBills);
      } else {
        // localStorage mode
        const updatedBills = localBills.map(bill => {
          const today = new Date();
          const dueDate = parseISO(bill.due_date);
          
          if (bill.status === 'unpaid' && isBefore(dueDate, today)) {
            return { ...bill, status: 'overdue' as const };
          }
          return bill;
        });

        setBills(updatedBills);
        
        // Update overdue bills in localStorage
        const hasOverdueChanges = updatedBills.some((bill, index) => 
          bill.status !== localBills[index]?.status
        );
        
        if (hasOverdueChanges) {
          setLocalBills(updatedBills);
        }
      }
    } catch (error: any) {
      console.error('Error fetching bills:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (entitlementsLoading || !isPremium) return; // Only fetch analytics for premium users
    
    try {
      setAnalyticsLoading(true);
      const [summary, monthly, customers, vendors, upcoming, inventory] = await Promise.all([
        analytics.getDashboardSummary(),
        analytics.getMonthlyAggregates(),
        analytics.getTopCustomers(5),
        analytics.getTopVendors(5),
        analytics.getUpcomingBills(10),
        analytics.getInventoryValue(),
      ]);
      
      setDashboardSummary(summary);
      setMonthlyData(monthly);
      setTopCustomers(customers);
      setTopVendors(vendors);
      setUpcomingBillsData(upcoming);
      setInventoryValue(inventory);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await updateProfile(fullName, company);
      await fetchProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBillStatus = async (bill: Bill) => {
    const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('bills')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', bill.id);

        if (error) throw error;
      } else {
        // localStorage mode
        const updatedBills = localBills.map(b =>
          b.id === bill.id ? { ...b, status: newStatus as 'unpaid' | 'paid' | 'overdue', updated_at: new Date().toISOString() } : b
        );
        setLocalBills(updatedBills);
      }

        // Gamification logic
        if (newStatus === 'paid' && rewards) {
          const dueDate = parseISO(bill.due_date);
          const today = new Date();
          const daysEarly = differenceInDays(dueDate, today);
          
          let xpAmount = 5; // On-time
          let description = 'Bill paid on time';
          
          if (daysEarly > 0) {
            xpAmount = 10; // Early payment
            description = `Bill paid ${daysEarly} days early`;
          } else if (daysEarly < 0) {
            xpAmount = -5; // Late payment
            description = 'Bill paid late';
          }

          const result: any = await awardXP('bill_paid', xpAmount, description, bill.id);
          await updateStreak(true, daysEarly);
          await checkAndAwardMilestoneBadges();

          // Show celebration
          if (result) {
            setCelebrationData({
              xpAwarded: result.xp_awarded || xpAmount,
              levelUp: result.level_up || false,
              newLevel: result.new_level || rewards.current_level,
            });
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 2000);
        }

        toast({
          title: `Bill marked as paid! +${xpAmount} XP`,
          description: daysEarly > 0 ? '🔥 Early payment bonus!' : 'Great job!',
        });
      } else {
        toast({
          title: `Bill marked as ${newStatus}!`,
        });
      }

      await fetchBills();
    } catch (error: any) {
      toast({
        title: "Error updating bill status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImportBills = async (importedBills: Partial<Bill>[]) => {
    try {
      const billsToImport = importedBills.map(bill => ({
        ...bill,
        id: bill.id || crypto.randomUUID(),
        user_id: user!.id,
        created_at: bill.created_at || new Date().toISOString(),
        updated_at: bill.updated_at || new Date().toISOString(),
      })) as Bill[];

      if (isSupabaseConfigured && supabase) {
        // For Supabase, insert the bills
        const { error } = await supabase
          .from('bills')
          .insert(billsToImport);

        if (error) throw error;
      } else {
        // For localStorage, merge with existing bills
        const existingIds = new Set(localBills.map(b => b.id));
        const newBills = billsToImport.filter(b => !existingIds.has(b.id));
        setLocalBills([...localBills, ...newBills]);
      }

      await fetchBills();
      toast({
        title: "Bills imported successfully!",
        description: `Added ${billsToImport.length} bills to your account.`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate statistics
  const activeBills = bills.filter(bill => bill.status !== 'paid');
  const overdueBills = bills.filter(bill => bill.status === 'overdue');
  const billsDueIn7Days = bills.filter(bill => {
    const dueDate = parseISO(bill.due_date);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    return bill.status === 'unpaid' && daysUntilDue >= 0 && daysUntilDue <= 7;
  });
  const paidBills = bills.filter(bill => bill.status === 'paid');
  const billsDueToday = bills.filter(bill => {
    const dueDate = parseISO(bill.due_date);
    return bill.status === 'unpaid' && isToday(dueDate);
  });

  const getBillStatusColor = (bill: Bill) => {
    if (bill.status === 'paid') return 'bg-green-100 text-green-800 border-green-200';
    if (bill.status === 'overdue') return 'bg-red-100 text-red-800 border-red-200';
    
    const daysUntilDue = differenceInDays(parseISO(bill.due_date), new Date());
    if (daysUntilDue <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Generate sparkline data for each stat (last 7 days)
  const generateSparklineData = (filterFn: (bill: Bill) => boolean) => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(new Date(), -6 + i);
      const count = bills.filter(bill => {
        const billDate = parseISO(bill.due_date);
        return filterFn(bill) && billDate.toDateString() === date.toDateString();
      }).length;
      return { value: count };
    });
  };

  const activeSparkline = generateSparklineData(b => b.status !== 'paid');
  const overdueSparkline = generateSparklineData(b => b.status === 'overdue');
  const dueSoonSparkline = generateSparklineData(b => {
    const daysUntilDue = differenceInDays(parseISO(b.due_date), new Date());
    return b.status !== 'paid' && daysUntilDue <= 7 && daysUntilDue >= 0;
  });
  const paidSparkline = generateSparklineData(b => b.status === 'paid');

  const handlePasskeyBannerDismiss = () => {
    setShowPasskeyBanner(false);
    localStorage.setItem('invoiceflow_passkey_banner_dismissed', 'true');
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <Navigation />
        
        {/* Daily Bonus Wheel */}
        {showBonusWheel && (
          <DailyBonusWheel
            onClaim={claimDailyBonus}
            onClose={() => setShowBonusWheel(false)}
            loading={bonusLoading}
          />
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 md:px-4 py-6 md:py-6 space-y-5 md:space-y-6 max-w-7xl">
          {/* Passkey Banner */}
          {showPasskeyBanner && (
            <AddPasskeyBanner onDismiss={handlePasskeyBannerDismiss} />
          )}

          {/* Header with Tier Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div>
                <h1 className={cn(
                  "text-3xl md:text-4xl font-black transition-colors duration-300",
                  isPro ? "pro-gradient-text" : "text-foreground"
                )}>
                  Dashboard
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-sm text-muted-foreground">
                    {profile?.full_name || user?.email?.split('@')[0] || 'Welcome back'}
                  </p>
                  {rewards && (
                    <TierBadge 
                      tier={rewards.tier} 
                      level={rewards.current_level}
                      variant="icon-only"
                    />
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRetryAll}
              disabled={loading || billsLoading}
              className={cn(
                "transition-colors duration-300 min-h-[44px] min-w-[44px]",
                isPro && "hover:bg-[hsl(45,100%,60%)]/10"
              )}
            >
              <RefreshCw className={`h-5 w-5 ${(loading || billsLoading) ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>

          {/* Reward Progress Bar */}
          {rewards && (
            <RewardProgressBar
              currentXP={rewards.total_xp}
              currentLevel={rewards.current_level}
              tier={rewards.tier}
              streak={rewards.current_streak}
              isPro={isPro}
            />
          )}

          {/* Motivational Banner */}
          {rewards && rewards.current_streak >= 3 && (
            <MotivationalBanner
              message={`🔥 ${rewards.current_streak}-day streak! Don't break it now!`}
              type="streak"
              isPro={isPro}
            />
          )}

          {rewards && overdueBills.length > 0 && rewards.current_streak === 0 && (
            <MotivationalBanner
              message="⏰ Clear your overdue bills to start a new streak!"
              icon="⚡"
              type="warning"
              isPro={isPro}
            />
          )}

          {/* Streak Countdown Banner */}
          {rewards && rewards.current_streak > 0 && isStreakInDanger() && (
            <StreakCountdownBanner
              streak={rewards.current_streak}
              timeRemaining={formatTimeRemaining()}
              isCritical={isCritical()}
              isInDanger={isStreakInDanger()}
              shieldCount={getShieldCounts().total}
              onUseShield={async () => {
                await useShield();
                toast({
                  title: 'Streak Protected!',
                  description: 'Your streak has been saved',
                });
              }}
              onBuyShield={() => setShowShieldShop(true)}
            />
          )}

          {/* Shield Shop Modal */}
          {rewards && (
            <StreakShieldShop
              open={showShieldShop}
              onClose={() => setShowShieldShop(false)}
              onPurchase={async (type) => {
                await purchaseShield(type);
              }}
              currentXP={rewards.total_xp}
              shieldCounts={getShieldCounts()}
            />
          )}

          {/* Premium Stat Cards with Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCardWithSparkline
              title="Active Bills"
              value={activeBills.length}
              icon={FileText}
              sparklineData={activeSparkline}
              iconColor="text-primary"
              gradientFrom="from-primary/10"
              gradientTo="to-primary/5"
              isPro={isPro}
              trendValue={contextPlan === 'free' ? `${bills.length}/${billLimit}` : undefined}
            />
            <StatCardWithSparkline
              title="Overdue"
              value={overdueBills.length}
              icon={AlertCircle}
              sparklineData={overdueSparkline}
              iconColor="text-destructive"
              gradientFrom="from-destructive/10"
              gradientTo="to-destructive/5"
              isPro={isPro}
              trend={overdueBills.length > 0 ? 'down' : 'neutral'}
            />
            <StatCardWithSparkline
              title="Due Soon"
              value={billsDueIn7Days.length}
              icon={Clock}
              sparklineData={dueSoonSparkline}
              iconColor="text-yellow-600"
              gradientFrom="from-yellow-600/10"
              gradientTo="to-yellow-600/5"
              isPro={isPro}
              trendValue="Next 7 days"
            />
            <StatCardWithSparkline
              title="Paid"
              value={paidBills.length}
              icon={CheckCircle}
              sparklineData={paidSparkline}
              iconColor="text-green-600"
              gradientFrom="from-green-600/10"
              gradientTo="to-green-600/5"
              isPro={isPro}
              trend="up"
            />
          </div>

          {/* Analytics Section */}
          {bills.length > 0 && (
            <DashboardAnalytics bills={bills} isPro={isPro} />
          )}

          {/* Premium Analytics Section */}
          {entitlementsLoading ? (
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Skeleton className="w-12 h-12 mx-auto rounded-full" />
                  <Skeleton className="h-6 w-48 mx-auto" />
                  <Skeleton className="h-4 w-64 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ) : isPremium ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-purple-500" />
                  Premium Analytics
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAnalytics}
                  disabled={analyticsLoading}
                >
                  <RefreshCw className={cn("w-4 h-4", analyticsLoading && "animate-spin")} />
                </Button>
              </div>
              
              {/* KPI Cards */}
              <DashboardKPIs summary={dashboardSummary} loading={analyticsLoading} />
              
              {/* Charts and Lists Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MonthlyChart data={monthlyData} loading={analyticsLoading} />
                <TopLists 
                  customers={topCustomers} 
                  vendors={topVendors} 
                  loading={analyticsLoading} 
                />
                <InventoryValueCard inventory={inventoryValue} loading={analyticsLoading} />
              </div>
              
              {/* Upcoming Bills */}
              <UpcomingBills bills={upcomingBillsData} loading={analyticsLoading} />
            </div>
          ) : (
            <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <BarChart3 className="w-12 h-12 text-purple-500 mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Unlock Premium Analytics</h3>
                    <p className="text-muted-foreground mb-4">
                      Get detailed insights with KPI cards, monthly trends, top customers/vendors, inventory tracking, and upcoming bills
                    </p>
                  </div>
                  <Button onClick={() => setShowUpgradeModal(true)} size="lg" className="gap-2">
                    <Crown className="w-4 h-4" />
                    Upgrade to Premium
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Limit Warnings */}
          <div className="space-y-2">
            {/* Current Plan Display */}
            <Card className={cn(
              "glass border-border/50 transition-all duration-300",
              (contextPlan === 'pro' || contextPlan === 'premium') && "border-[hsl(45,100%,60%)]/30 bg-gradient-to-br from-[hsl(45,100%,60%)]/5 to-transparent"
            )}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      (contextPlan === 'pro' || contextPlan === 'premium') ? "bg-[hsl(45,100%,60%)]/10" : "bg-primary/10"
                    )}>
                      <Crown className={cn(
                        "h-5 w-5",
                        (contextPlan === 'pro' || contextPlan === 'premium') ? "text-[hsl(45,100%,60%)]" : "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                      <p className={cn(
                        "text-xl font-bold capitalize",
                        (contextPlan === 'pro' || contextPlan === 'premium') && "pro-gradient-text"
                      )}>
                        {planLoading ? (
                          <Skeleton className="h-6 w-20" />
                        ) : (
                          contextPlan || plan || 'Free'
                        )}
                      </p>
                    </div>
                  </div>
                  {!(contextPlan === 'pro' || contextPlan === 'premium') && (
                    <Button
                      onClick={() => setShowUpgradeModal(true)}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <FreemiumLimitCard
              type="bills"
              currentCount={bills.length}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
            <FreemiumLimitCard
              type="ai"
              currentCount={aiQueriesUsed}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </div>

          {/* Bills Due Today Alert */}
          {billsDueToday.length > 0 && (
            <Card className={cn(
              "border-yellow-200 bg-yellow-50/50 glass transition-all duration-300",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/40"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-yellow-800 text-base">
                  <Calendar className="h-4 w-4" />
                  <span>Due Today ({billsDueToday.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {billsDueToday.map((bill) => (
                  <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/80 glass rounded-xl border border-yellow-100">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{bill.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatINRCompact(bill.amount)} • {bill.category.charAt(0).toUpperCase() + bill.category.slice(1)}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="gradient"
                      onClick={() => toggleBillStatus(bill)}
                      className="w-full sm:w-auto shrink-0"
                    >
                      <CheckCircle className="h-3 w-3 mr-1.5" />
                      Mark Paid
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Bills Table */}
          <Card className={cn(
            "glass border-border/50 shadow-glass transition-all duration-300",
            isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "transition-colors duration-300",
                isPro && "pro-gradient-text"
              )}>
                Recent Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No bills yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by adding your first bill</p>
                  <Button onClick={() => navigate('/bills')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Bill
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-[600px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Bill Name</TableHead>
                          <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-xs sm:text-sm">Due Date</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.slice(0, 5).map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">{bill.name}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatINRCompact(bill.amount)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge className={`${getBillStatusColor(bill)} text-xs`}>
                                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleBillStatus(bill)}
                                disabled={bill.status === 'paid'}
                                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                              >
                                {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {bills.length > 5 && (
                      <div className="text-center mt-4">
                        <Button variant="outline" onClick={() => navigate('/bills')}>
                          View All Bills
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export/Import Section */}
          {showExportImport && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Export/Import Bills</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowExportImport(false)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExportImport 
                  bills={bills} 
                  onImportBills={handleImportBills}
                  userId={user!.id}
                />
              </CardContent>
            </Card>
          )}

          {/* Upgrade Modal */}
          <UpgradeModal 
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            currentBillCount={bills.length}
          />

        </main>

        {/* Floating Action Buttons */}
        <FloatingActionButtons
          onAddBill={() => {
            if (!canAddBill(bills.length)) {
              setShowUpgradeModal(true);
            } else {
              navigate('/bills');
            }
          }}
          onExport={() => setShowExportImport(true)}
          onSettings={() => navigate('/settings')}
          onUpgrade={() => setShowUpgradeModal(true)}
          canAddBill={canAddBill(bills.length)}
          showUpgrade={plan === 'free'}
          isPro={isPro}
        />

        <EnhancedAIAssistantV2 
          bills={bills}
          context="dashboard - managing bills and getting financial insights"
        />

        {/* Celebration Animation */}
        {celebrationData && (
          <CelebrationAnimation
            trigger={showCelebration}
            xpAwarded={celebrationData.xpAwarded}
            levelUp={celebrationData.levelUp}
            newLevel={celebrationData.newLevel}
            onComplete={() => setCelebrationData(null)}
          />
        )}

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
    </MobileLayout>
  );
};

export default Dashboard;