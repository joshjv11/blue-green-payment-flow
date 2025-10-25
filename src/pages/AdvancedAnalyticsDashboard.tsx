import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Navigation } from '@/components/Navigation';
import { BackToDashboard } from '@/components/BackToDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { useToast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Package, 
  Users, 
  ShoppingCart, 
  Bell, 
  Calculator, 
  FileText,
  Star,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequirePlan } from '@/components/RequirePlan';

// Lazy load tab components for performance
const OverviewTab = lazy(() => import('@/components/analytics-tabs/OverviewTab'));
const ProfitabilityTab = lazy(() => import('@/components/analytics-tabs/ProfitabilityTab'));
const InventoryTab = lazy(() => import('@/components/analytics-tabs/InventoryTab'));
const CustomerIntelligenceTab = lazy(() => import('@/components/analytics-tabs/CustomerIntelligenceTab'));
const SalesTrendsTab = lazy(() => import('@/components/analytics-tabs/SalesTrendsTab'));
const SmartAlertsTab = lazy(() => import('@/components/analytics-tabs/SmartAlertsTab'));
const ScenarioPlanningTab = lazy(() => import('@/components/analytics-tabs/ScenarioPlanningTab'));
const CustomReportsTab = lazy(() => import('@/components/analytics-tabs/CustomReportsTab'));

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.LazyExoticComponent<() => JSX.Element>;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    component: OverviewTab,
    description: 'KPI Summary & Key Metrics'
  },
  {
    id: 'profitability',
    label: 'Profitability',
    icon: TrendingUp,
    component: ProfitabilityTab,
    description: 'Profit & Loss Analysis'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    component: InventoryTab,
    description: 'Stock & Forecasting'
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    component: CustomerIntelligenceTab,
    description: 'Customer Intelligence'
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    component: SalesTrendsTab,
    description: 'Sales & Trends'
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: Bell,
    component: SmartAlertsTab,
    description: 'Smart Alerts & Insights'
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    icon: Calculator,
    component: ScenarioPlanningTab,
    description: 'Scenario Planning'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    component: CustomReportsTab,
    description: 'Custom Reports'
  }
];

const FAVORITES_KEY = 'analytics-favorites';
const FILTER_STATE_KEY = 'analytics-filters';

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

const AdvancedAnalyticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasAdvancedAnalytics } = useSupabasePlan();
  
  // State management
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [filterState, setFilterState] = useState<Record<string, any>>({});

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    }
  }, []);

  // Load filter state from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem(FILTER_STATE_KEY);
    if (savedFilters) {
      try {
        setFilterState(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Failed to load filter state:', e);
      }
    }
  }, []);

  // Sync active tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabs.some(t => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Toggle favorite
  const toggleFavorite = (tabId: string) => {
    const newFavorites = favorites.includes(tabId)
      ? favorites.filter(id => id !== tabId)
      : [...favorites, tabId];
    
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    
    toast({
      title: favorites.includes(tabId) ? 'Removed from favorites' : 'Added to favorites',
      description: `Tab ${favorites.includes(tabId) ? 'removed from' : 'added to'} quick access`,
    });
  };

  // Save filter state
  const saveFilterState = (tabId: string, filters: any) => {
    const newState = { ...filterState, [tabId]: filters };
    setFilterState(newState);
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(newState));
  };

  const currentTab = tabs.find(t => t.id === activeTab);
  const favoriteTabsData = tabs.filter(t => favorites.includes(t.id));

  return (
    <RequirePlan requiredPlan="premium" featureName="Advanced Analytics Dashboard">
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        
        <div className="container mx-auto px-3 py-4 md:px-4 md:py-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <BackToDashboard />
            
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/analytics">Analytics</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Advanced Analytics</BreadcrumbPage>
                </BreadcrumbItem>
                {currentTab && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentTab.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Advanced Analytics
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentTab?.description || 'Comprehensive business insights'}
                </p>
              </div>
              
              {/* Quick Access Button */}
              <Button
                variant="outline"
                onClick={() => setShowQuickAccess(!showQuickAccess)}
                className="w-full md:w-auto"
              >
                {showQuickAccess ? <X className="h-4 w-4 mr-2" /> : <Menu className="h-4 w-4 mr-2" />}
                Quick Access
                {favoriteTabsData.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {favoriteTabsData.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Quick Access Panel */}
            {showQuickAccess && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Favorite Tabs</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuickAccess(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {favoriteTabsData.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Click the star icon on any tab to add it to quick access
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tabs Interface */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              {/* Tab List - Responsive */}
              <div className="relative">
                <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto gap-1 p-1 bg-muted">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isFavorite = favorites.includes(tab.id);
                    
                    return (
                      <div key={tab.id} className="relative group">
                        <TabsTrigger
                          value={tab.id}
                          className="w-full flex flex-col items-center gap-1 py-3 data-[state=active]:bg-background"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs truncate w-full text-center">
                            {tab.label}
                          </span>
                        </TabsTrigger>
                        
                        {/* Favorite Star Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(tab.id);
                          }}
                          className={cn(
                            "absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
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
                  })}
                </TabsList>
              </div>

              {/* Tab Content - Lazy Loaded */}
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-6">
                  <Suspense fallback={<TabLoadingSkeleton />}>
                    <tab.component />
                  </Suspense>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </RequirePlan>
  );
};

export default AdvancedAnalyticsDashboard;
