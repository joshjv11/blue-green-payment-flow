import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { formatINR, formatINRCompact } from '@/utils/currency';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useToast } from '@/hooks/use-toast';
import { BackToDashboard } from '@/components/BackToDashboard';
import { logError } from '@/lib/logger';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Crown, 
  AlertCircle, 
  RefreshCw,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Bell,
  Calculator,
  FileText,
  Star,
  Menu,
  X,
  Zap,
  Sparkles,
  Lock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import UpgradeModal from '@/components/UpgradeModal';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import { useLoadingWatchdog } from '@/hooks/useLoadingWatchdog';
import { cancelAllQueries, refetchAllQueries } from '@/lib/query';
import { RequirePlan } from '@/components/RequirePlan';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

// Lazy load advanced analytics tabs
const OverviewTab = lazy(() => import('@/components/analytics-tabs/OverviewTab'));
const ProfitabilityTab = lazy(() => import('@/components/analytics-tabs/ProfitabilityTab'));
const InventoryTab = lazy(() => import('@/components/analytics-tabs/InventoryTab'));
const SalesTrendsTab = lazy(() => import('@/components/analytics-tabs/SalesTrendsTab'));
const SmartAlertsTab = lazy(() => import('@/components/analytics-tabs/SmartAlertsTab'));
const ScenarioPlanningTab = lazy(() => import('@/components/analytics-tabs/ScenarioPlanningTab'));
const CustomReportsTab = lazy(() => import('@/components/analytics-tabs/CustomReportsTab'));

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

interface Tab {
  id: string;
  label: string;
  icon: any;
  component: any;
  description: string;
  premium?: boolean;
}

const advancedTabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    component: OverviewTab,
    description: 'KPI Summary & Key Metrics',
    premium: true
  },
  {
    id: 'profitability',
    label: 'Profitability',
    icon: TrendingUp,
    component: ProfitabilityTab,
    description: 'Profit & Loss Analysis',
    premium: true
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    component: InventoryTab,
    description: 'Stock & Forecasting',
    premium: true
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    component: SalesTrendsTab,
    description: 'Sales & Trends',
    premium: true
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: Bell,
    component: SmartAlertsTab,
    description: 'Smart Alerts & Insights',
    premium: true
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    icon: Calculator,
    component: ScenarioPlanningTab,
    description: 'Scenario Planning',
    premium: true
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    component: CustomReportsTab,
    description: 'Custom Reports',
    premium: true
  }
];

const FAVORITES_KEY = 'analytics-favorites';

const TabLoadingSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

const Analytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { plan, hasAdvancedAnalytics, aiQueriesUsed, aiQueriesLimit, isPremium } = useSupabasePlan();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'basic');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  
  // Payment verification moved to App.tsx to prevent duplicate calls

  // Loading watchdog
  useLoadingWatchdog({
    enabled: true,
    onTimeout: () => {
      console.warn('⚠️ Loading timeout in Analytics page');
    }
  });

  // Load favorites
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    }
  }, []);

  // Sync active tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'basic' || advancedTabs.some(t => t.id === tabFromUrl))) {
      setActiveTab(tabFromUrl);
    } else if (tabFromUrl === 'customers') {
      // Redirect from old customers tab to overview
      setActiveTab('overview');
      setSearchParams({ tab: 'overview' });
    }
  }, [searchParams]);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const toggleFavorite = (tabId: string) => {
    const newFavorites = favorites.includes(tabId)
      ? favorites.filter(id => id !== tabId)
      : [...favorites, tabId];
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
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
      
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('🔴 Analytics fetch error:', error);
        
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
      
      await logError(error, 'Analytics', 'fetchBills', {
        userId: user?.id,
      });
      
      toast({
        title: "Failed to load analytics",
        description: error.message || "Could not fetch your bills data. Please try again.",
        variant: "destructive",
      });
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate basic analytics
  const totalAmount = bills.length > 0 ? bills.reduce((sum, bill) => sum + bill.amount, 0) : 0;
  const paidAmount = bills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const unpaidAmount = bills.filter(bill => bill.status !== 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const overdueBills = bills.filter(bill => bill.status === 'overdue').length;

  const currentTab = activeTab !== 'basic' ? advancedTabs.find(t => t.id === activeTab) : null;
  const favoriteTabsData = advancedTabs.filter(t => favorites.includes(t.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-3 py-4 md:px-4 md:py-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <BackToDashboard />
          
          {/* Enhanced Header */}
          <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-sm -mx-3 px-3 md:-mx-4 md:px-4 py-4 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isPremium ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20" : "bg-primary/10"
                  )}>
                    <BarChart3 className={cn(
                      "h-5 w-5",
                      isPremium ? "text-purple-500" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                      Analytics Dashboard
                      {isPremium && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {currentTab?.description || 'Comprehensive financial insights and business intelligence'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                {isPremium && favoriteTabsData.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickAccess(!showQuickAccess)}
                  >
                    {showQuickAccess ? <X className="h-4 w-4 mr-2" /> : <Menu className="h-4 w-4 mr-2" />}
                    Quick Access
                    <Badge variant="secondary" className="ml-2">
                      {favoriteTabsData.length}
                    </Badge>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRetryAll}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                {!isPremium && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  >
                    <Crown className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Access Panel */}
          {showQuickAccess && favoriteTabsData.length > 0 && (
            <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    Favorite Tabs
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickAccess(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {favoriteTabsData.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => {
                          handleTabChange(tab.id);
                          setShowQuickAccess(false);
                        }}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Freemium Limit Card */}
          <FreemiumLimitCard
            type="ai"
            currentCount={aiQueriesUsed}
            onUpgrade={() => setShowUpgradeModal(true)}
          />

          {/* Main Tabs Interface */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full h-auto p-1 bg-muted/50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-1">
              <TabsTrigger 
                value="basic" 
                className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Basic</span>
              </TabsTrigger>
              
              {isPremium ? (
                advancedTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isFavorite = favorites.includes(tab.id);
                  
                  return (
                    <div key={tab.id} className="relative group">
                      <TabsTrigger
                        value={tab.id}
                        className="w-full flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs truncate w-full text-center">
                          {tab.label}
                        </span>
                      </TabsTrigger>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(tab.id);
                        }}
                        className={cn(
                          "absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10",
                          isFavorite && "opacity-100"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-3 w-3",
                            isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          )}
                        />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-8 flex items-center justify-center p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-muted-foreground"
                  >
                    <Lock className="h-3 w-3 mr-2" />
                    <span className="text-xs">Unlock Premium Analytics</span>
                  </Button>
                </div>
              )}
            </TabsList>

            {/* Basic Analytics Tab */}
            <TabsContent value="basic" className="mt-6 space-y-4">
              {bills.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="text-base md:text-lg font-semibold mb-1.5">No Bills Yet</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-4">
                      Start by adding your first bill to see analytics
                    </p>
                    <Button onClick={() => window.location.href = '/bills'} size="sm">
                      Add Your First Bill
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                      <CardContent className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-muted-foreground">Total Bills</span>
                          </div>
                          <p className="text-xl md:text-2xl font-bold">{bills.length}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                      <CardContent className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-muted-foreground">Total Amount</span>
                          </div>
                          <p className="text-base md:text-xl font-bold truncate">{formatINRCompact(totalAmount)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                      <CardContent className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs text-muted-foreground">Paid</span>
                          </div>
                          <p className="text-base md:text-xl font-bold text-emerald-600 truncate">{formatINRCompact(paidAmount)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                      <CardContent className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-muted-foreground">Pending</span>
                          </div>
                          <p className="text-base md:text-xl font-bold text-red-600 truncate">{formatINRCompact(unpaidAmount)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment Progress */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Payment Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Paid Bills</span>
                          <span className="font-semibold">{Math.round((paidAmount / totalAmount) * 100)}%</span>
                        </div>
                        <Progress value={(paidAmount / totalAmount) * 100} className="h-2.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>₹{paidAmount.toLocaleString()} paid</span>
                          <span>₹{unpaidAmount.toLocaleString()} pending</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Premium Upgrade CTA */}
                  {!isPremium && (
                    <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                            <Zap className="h-6 w-6 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">Unlock Advanced Analytics</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              Get detailed insights with profitability analysis, inventory tracking, sales trends, and more
                            </p>
                            <Button 
                              onClick={() => setShowUpgradeModal(true)}
                              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Upgrade to Premium
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Advanced Analytics Tabs */}
            {isPremium && advancedTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <tab.component />
                </Suspense>
              </TabsContent>
            ))}
          </Tabs>
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
