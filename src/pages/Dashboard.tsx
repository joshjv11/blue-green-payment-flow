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
import { LogOut, User, Building, Mail, FileText, ArrowRight, Plus, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, BarChart3, Settings, Download, Upload, Crown, RefreshCw, MessageCircle, Send } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { parseISO, differenceInDays, isBefore, isToday, isAfter, addDays, format } from 'date-fns';
import ExportImport from '@/components/ExportImport';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
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
import { trackFeatureUsage } from '@/lib/analytics';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';
import { EMICard } from '@/components/EMICard';
import { Target, CreditCard, PieChart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OnboardingTour } from '@/components/OnboardingTour';
import { SwipeableBillCard } from '@/components/SwipeableBillCard';
import { Locale, t } from '@/utils/locale';

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
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [activeEMIs, setActiveEMIs] = useState<any[]>([]);
  const [spendingAlert, setSpendingAlert] = useState<any>(null);
  
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

  // Load Pro features data - OPTIMIZED: Single RPC call instead of 4 separate queries
  const loadProFeaturesData = async () => {
    try {
      if (!user) return;

      // Fallback to individual queries
      await loadProFeaturesDataFallback();
    } catch (error) {
      console.error('Error loading pro features:', error);
    }
  };

  // Fallback: Individual queries (original logic)
  const loadProFeaturesDataFallback = async () => {
    if (!user) return;

    try {
      const [goalsResult, emisResult, expensesResult, alertsResult] = await Promise.all([
        supabase.from('savings_goals').select('*').eq('user_id', user.id).eq('is_completed', false).order('created_at', { ascending: false }).limit(3),
        supabase.from('emi_tracker').select('*').eq('user_id', user.id).eq('is_active', true).order('next_due_date', { ascending: true }).limit(3),
        supabase.from('expenses').select('category, amount').eq('user_id', user.id).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase.from('spending_alerts').select('*').eq('user_id', user.id).eq('is_active', true)
      ]);

      setSavingsGoals(goalsResult.data || []);
      setActiveEMIs(emisResult.data || []);

      if (alertsResult.data && expensesResult.data) {
        const categorySpending: Record<string, number> = {};
        expensesResult.data.forEach((e: any) => {
          categorySpending[e.category] = (categorySpending[e.category] || 0) + parseFloat(e.amount || 0);
        });

        for (const alert of alertsResult.data) {
          const currentSpending = categorySpending[alert.category] || 0;
          const threshold = (alert.monthly_limit * alert.alert_threshold) / 100;
          if (currentSpending >= threshold) {
            setSpendingAlert(alert);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Fallback query error:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (entitlementsLoading) return; // Wait for entitlements to load
    
    // Load Pro features data (savings goals, EMIs) for Pro/Premium users
    if (isPro || contextPlan === 'premium') {
      loadProFeaturesData();
    }
    
    // Premium analytics moved to /analytics page
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

  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');

  return (
    <MobileLayout>
      <OnboardingTour />
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        
        {/* Daily Bonus Wheel */}
        {showBonusWheel && (
          <DailyBonusWheel
            onClaim={claimDailyBonus}
            onClose={() => setShowBonusWheel(false)}
            loading={bonusLoading}
          />
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 max-w-7xl">
          {/* Passkey Banner */}
          {showPasskeyBanner && (
            <AddPasskeyBanner onDismiss={handlePasskeyBannerDismiss} />
          )}

          {/* Header with Tier Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2"
          >
            <div className="flex items-center gap-4">
              <div>
                <h1 className={cn(
                  "text-3xl md:text-4xl font-bold transition-colors duration-300 tracking-tight",
                  isPro ? "pro-gradient-text" : "text-foreground"
                )}>
                  Dashboard
                </h1>
                <div className="flex items-center gap-2.5 mt-2">
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
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="default"
                onClick={handleRetryAll}
                disabled={loading || billsLoading}
                className={cn(
                  "h-10 px-4 gap-2 transition-colors duration-300",
                  isPro && "hover:bg-[hsl(45,100%,60%)]/10"
                )}
              >
                <RefreshCw className={cn("h-4 w-4", (loading || billsLoading) && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="ghost"
                size="default"
                onClick={signOut}
                className="h-10 px-4 gap-2 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
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

          {/* Hero Metrics - Simplified to 3 key metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <StatCardWithSparkline
              title={t('active_bills', locale)}
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
              title={t('overdue', locale)}
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
              title={t('due_soon', locale)}
              value={billsDueIn7Days.length}
              icon={Clock}
              sparklineData={dueSoonSparkline}
              iconColor="text-yellow-600"
              gradientFrom="from-yellow-600/10"
              gradientTo="to-yellow-600/5"
              isPro={isPro}
              trendValue="Next 7 days"
            />
          </div>

          {/* See More Button - Expand to show all metrics */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/bills')}
              className="h-10 px-6 gap-2 min-h-[48px]"
              data-tour="add-bill"
            >
              <ArrowRight className="h-4 w-4" />
              {t('see_more', locale)} - {t('bills', locale)}
            </Button>
          </div>

          {/* WhatsApp Integration Card */}
          {(isPro || contextPlan === 'premium') && (
            <Card className="border-border/50 hover:border-green-500/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-xl bg-green-500/10 shrink-0">
                      <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1">WhatsApp Business</h3>
                      <p className="text-sm text-muted-foreground">
                        Send invoices and payment reminders via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => navigate('/whatsapp')}
                    className="h-10 px-4 gap-2 shrink-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Open</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Section - Basic Only */}
          {bills.length > 0 && (
            <DashboardAnalytics bills={bills} isPro={isPro} />
          )}

          {/* Quick Link to Advanced Analytics */}
          {isPremium && (
            <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 cursor-pointer hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg"
                  onClick={() => navigate('/analytics?tab=overview')}>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 shrink-0">
                      <BarChart3 className="h-6 w-6 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold mb-1.5">Advanced Analytics</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        View detailed insights, profitability analysis, inventory tracking, and more
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="default" className="h-10 w-10 p-0 shrink-0">
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Limit Warnings */}
          <div className="space-y-4">
            {/* Current Plan Display */}
            <Card className={cn(
              "border-border/50 transition-all duration-300",
              (contextPlan === 'pro' || contextPlan === 'premium') && "border-[hsl(45,100%,60%)]/30 bg-gradient-to-br from-[hsl(45,100%,60%)]/5 to-transparent"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-colors shrink-0",
                      (contextPlan === 'pro' || contextPlan === 'premium') ? "bg-[hsl(45,100%,60%)]/10" : "bg-primary/10"
                    )}>
                      <Crown className={cn(
                        "h-5 w-5",
                        (contextPlan === 'pro' || contextPlan === 'premium') ? "text-[hsl(45,100%,60%)]" : "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current Plan</p>
                      <p className={cn(
                        "text-xl md:text-2xl font-bold capitalize",
                        (contextPlan === 'pro' || contextPlan === 'premium') && "pro-gradient-text"
                      )}>
                        {planLoading ? (
                          <Skeleton className="h-7 w-24" />
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
                      size="default"
                      className="h-10 px-4 gap-2 shrink-0"
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
              "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 transition-all duration-300",
              isPro && "border-[hsl(45,100%,60%)]/40"
            )}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2.5 text-yellow-800 dark:text-yellow-200 text-lg font-semibold">
                  <Calendar className="h-5 w-5" />
                  <span>Due Today ({billsDueToday.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {billsDueToday.map((bill) => (
                  <SwipeableBillCard
                    key={bill.id}
                    bill={bill}
                    onToggleStatus={toggleBillStatus}
                    getStatusColor={getBillStatusColor}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pro Features Widgets */}
          {(isPro || contextPlan === 'premium') && (
            <>
              {/* Savings Goals Widget */}
              {savingsGoals.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
                        <Target className="h-5 w-5" />
                        Savings Goals
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => navigate('/savings-goals')}
                        className="h-9 px-4 gap-2"
                      >
                        View All
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {savingsGoals.map((goal) => (
                        <SavingsGoalCard key={goal.id} goal={goal} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* EMI Manager Widget */}
              {activeEMIs.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
                        <CreditCard className="h-5 w-5" />
                        EMI & Debt Manager
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => navigate('/emi-manager')}
                        className="h-9 px-4 gap-2"
                      >
                        View All
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {activeEMIs.map((emi) => (
                        <EMICard key={emi.id} emi={emi} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Spending Alert */}
              {spendingAlert && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Spending Alert!</strong> You've exceeded {spendingAlert.alert_threshold}% of your {spendingAlert.category} spending limit this month.
                    {' '}
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => navigate('/spending-insights')}
                    >
                      View Details
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* AI Financial Coach */}
          <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-pink-500/10">
            <CardContent className="p-6 md:p-8">
              <EnhancedAIAssistantV2 
                bills={bills}
                context="dashboard - managing bills and getting financial insights"
                trigger={
                  <div className="w-full">
                    <div className="flex items-start justify-between flex-col sm:flex-row gap-4 mb-4">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent mb-2">
                          Make your business smarter with AI
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground">
                          Get instant insights, smarter decisions, and faster growth.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="group h-12 px-6 md:px-8 text-base font-semibold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-2xl hover:shadow-pink-500/30 transition-all duration-300 gap-2"
                    >
                      Start AI Coaching
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>

          {/* Recent Bills Table */}
          <Card className={cn(
            "border-border/50 transition-all duration-300",
            isPro && "border-[hsl(45,100%,60%)]/30"
          )}>
            <CardHeader className="pb-4">
              <CardTitle className={cn(
                "text-lg md:text-xl font-semibold transition-colors duration-300",
                isPro && "pro-gradient-text"
              )}>
                Recent Bills
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                <div className="text-center py-12 px-4">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">No bills yet</h3>
                  <p className="text-muted-foreground mb-6 text-sm md:text-base">Get started by adding your first bill</p>
                  <Button onClick={() => navigate('/bills')} size="default" className="h-10 px-6 gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Bill
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile: Swipeable Cards */}
                  <div className="block md:hidden space-y-3">
                    {bills.slice(0, 5).map((bill) => (
                      <SwipeableBillCard
                        key={bill.id}
                        bill={bill}
                        onToggleStatus={toggleBillStatus}
                        getStatusColor={getBillStatusColor}
                      />
                    ))}
                    {bills.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" onClick={() => navigate('/bills')} size="default" className="h-10 px-6 gap-2 min-h-[48px]">
                          {t('see_more', locale)} ({bills.length - 5} {t('bills', locale)})
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Desktop: Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow className="border-b">
                            <TableHead className="text-sm font-semibold h-12">{t('bill_name', locale)}</TableHead>
                            <TableHead className="text-sm font-semibold">{t('amount', locale)}</TableHead>
                            <TableHead className="text-sm font-semibold">{t('due_date', locale)}</TableHead>
                            <TableHead className="text-sm font-semibold">{t('status', locale)}</TableHead>
                            <TableHead className="text-sm font-semibold text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bills.slice(0, 5).map((bill) => (
                            <TableRow key={bill.id} className="border-b hover:bg-muted/50 transition-colors">
                              <TableCell className="font-medium text-sm py-4">{bill.name}</TableCell>
                              <TableCell className="text-sm py-4">{formatINRCompact(bill.amount)}</TableCell>
                              <TableCell className="text-sm py-4 text-muted-foreground">{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell className="py-4">
                                <Badge className={`${getBillStatusColor(bill)} text-xs px-2.5 py-1`}>
                                  {t(bill.status, locale)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 text-right">
                                <Button 
                                  size="default" 
                                  variant="outline"
                                  onClick={() => toggleBillStatus(bill)}
                                  disabled={bill.status === 'paid'}
                                  className="h-10 px-4 text-sm min-h-[48px]"
                                >
                                  {bill.status === 'paid' ? t('paid', locale) : t('mark_paid', locale)}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {bills.length > 5 && (
                        <div className="text-center p-6 border-t">
                          <Button variant="outline" onClick={() => navigate('/bills')} size="default" className="h-10 px-6 gap-2 min-h-[48px]">
                            {t('see_more', locale)} ({bills.length - 5} {t('bills', locale)})
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
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