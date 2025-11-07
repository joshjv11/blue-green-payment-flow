/**
 * Component Playground
 * Interactive testing environment for all components
 * 
 * Access at: /component-playground
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Play, Code, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import all components for testing
import { EMICard } from '@/components/EMICard';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';
import { StatCardWithSparkline } from '@/components/StatCardWithSparkline';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import PlanStatusCard from '@/components/PlanStatusCard';
import { TierBadge } from '@/components/TierBadge';
import { ProBadge } from '@/components/ProBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import ErrorBoundary from '@/components/ErrorBoundary';

// Component registry
const COMPONENTS = [
  {
    name: 'EMICard',
    component: EMICard,
    category: 'Financial',
    description: 'Displays EMI information',
    defaultProps: {
      emi: {
        id: '1',
        emi_name: 'Home Loan',
        principal_amount: 1000000,
        monthly_payment: 50000,
        interest_rate: 8.5,
        tenure_months: 240,
        start_date: '2024-01-01',
        status: 'active',
      },
    },
  },
  {
    name: 'SavingsGoalCard',
    component: SavingsGoalCard,
    category: 'Financial',
    description: 'Displays savings goal progress',
    defaultProps: {
      goal: {
        id: '1',
        goal_name: 'Vacation Fund',
        target_amount: 100000,
        current_amount: 35000,
        monthly_contribution: 5000,
        goal_type: 'vacation',
        target_date: '2025-12-31',
        is_completed: false,
      },
    },
  },
  {
    name: 'StatCardWithSparkline',
    component: StatCardWithSparkline,
    category: 'Analytics',
    description: 'Stat card with sparkline chart',
    defaultProps: {
      title: 'Total Revenue',
      value: '₹1,25,000',
      change: '+12.5%',
      trend: 'up',
      data: [100, 120, 110, 130, 125, 140, 135],
    },
  },
  {
    name: 'EmptyState',
    component: EmptyState,
    category: 'UI',
    description: 'Empty state placeholder',
    defaultProps: {
      title: 'No items found',
      description: 'Get started by adding your first item',
      action: {
        label: 'Add Item',
        onClick: () => console.log('Add clicked'),
      },
    },
  },
  {
    name: 'LoadingSkeleton',
    component: LoadingSkeleton,
    category: 'UI',
    description: 'Loading skeleton placeholder',
    defaultProps: {
      count: 3,
    },
  },
  {
    name: 'FreemiumLimitCard',
    component: FreemiumLimitCard,
    category: 'Billing',
    description: 'Freemium limit indicator',
    defaultProps: {
      type: 'bills' as const,
      currentCount: 5,
      onUpgrade: () => console.log('Upgrade clicked'),
    },
  },
  {
    name: 'PlanStatusCard',
    component: PlanStatusCard,
    category: 'Billing',
    description: 'Current plan status',
    defaultProps: {
      onUpgrade: () => console.log('Upgrade clicked'),
    },
  },
  {
    name: 'TierBadge',
    component: TierBadge,
    category: 'UI',
    description: 'User tier badge',
    defaultProps: {
      tier: 'pro',
    },
  },
  {
    name: 'ProBadge',
    component: ProBadge,
    category: 'UI',
    description: 'Pro plan badge',
    defaultProps: {},
  },
  {
    name: 'ThemeToggle',
    component: ThemeToggle,
    category: 'UI',
    description: 'Theme switcher',
    defaultProps: {},
  },
] as const;

type ComponentInfo = typeof COMPONENTS[number];

export default function ComponentPlayground() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(COMPONENTS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [props, setProps] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  // Filter components
  const filteredComponents = COMPONENTS.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         comp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(COMPONENTS.map(c => c.category)))];

  // Initialize props when component changes
  const handleComponentSelect = (comp: ComponentInfo) => {
    setSelectedComponent(comp);
    setProps(comp.defaultProps || {});
    setError(null);
  };

  // Render component with error boundary
  const renderComponent = () => {
    if (!selectedComponent) return null;

    const Component = selectedComponent.component;
    const componentProps = { ...selectedComponent.defaultProps, ...props };

    return (
      <ErrorBoundary
        fallback={<div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Component Error</span>
          </div>
          <p className="mt-2 text-sm text-red-700">Failed to render component</p>
        </div>}
      >
        <div className="p-6 border rounded-lg bg-background">
          <Component {...componentProps} type="bills" currentCount={0} onUpgrade={() => {}} />
        </div>
      </ErrorBoundary>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Component Playground</h1>
        <p className="text-muted-foreground mt-2">
          Interactive testing environment for all components
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Components</CardTitle>
            <div className="space-y-2 mt-4">
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredComponents.map(comp => (
                  <button
                    key={comp.name}
                    onClick={() => handleComponentSelect(comp)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedComponent?.name === comp.name
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className="font-semibold">{comp.name}</div>
                    <div className="text-sm opacity-80">{comp.description}</div>
                    <Badge variant="outline" className="mt-1">
                      {comp.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Component Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedComponent?.name || 'Select a component'}
            </CardTitle>
            {selectedComponent && (
              <p className="text-sm text-muted-foreground">
                {selectedComponent.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList>
                <TabsTrigger value="preview">
                  <Play className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="props">
                  <Code className="w-4 h-4 mr-2" />
                  Props
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="w-4 h-4 mr-2" />
                  Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4">
                {selectedComponent ? (
                  <div className="space-y-4">
                    {renderComponent()}
                    {error && (
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="w-5 h-5" />
                          <span className="font-semibold">Error</span>
                        </div>
                        <p className="mt-2 text-sm text-red-700">{error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a component to preview
                  </div>
                )}
              </TabsContent>

              <TabsContent value="props" className="mt-4">
                {selectedComponent ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Edit props to test different states
                    </div>
                    <div className="space-y-2">
                      {Object.entries(selectedComponent.defaultProps || {}).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label>{key}</Label>
                          <Input
                            value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            onChange={(e) => {
                              try {
                                const newValue = e.target.value;
                                setProps(prev => ({
                                  ...prev,
                                  [key]: newValue.includes('{') || newValue.includes('[')
                                    ? JSON.parse(newValue)
                                    : newValue,
                                }));
                              } catch (err) {
                                // Invalid JSON, keep as string
                                setProps(prev => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a component to edit props
                  </div>
                )}
              </TabsContent>

              <TabsContent value="code" className="mt-4">
                {selectedComponent ? (
                  <div className="space-y-4">
                    <div className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                      <div className="text-xs text-muted-foreground mb-2">Usage:</div>
                      <pre>{`<${selectedComponent.name} ${Object.entries({ ...selectedComponent.defaultProps, ...props })
                        .map(([k, v]) => `${k}={${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}}`)
                        .join(' ')} />`}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a component to view code
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{COMPONENTS.length}</div>
              <div className="text-sm text-muted-foreground">Total Components</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{categories.length - 1}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{filteredComponents.length}</div>
              <div className="text-sm text-muted-foreground">Filtered Results</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

