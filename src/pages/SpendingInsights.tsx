import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { BackToDashboard } from '@/components/BackToDashboard';
import { PageTransition } from '@/components/PageTransition';
import { PremiumGuard } from '@/components/PremiumGuard';
import { useExpenseTrackingSettings } from '@/hooks/useExpenseTrackingSettings';
import { TodaysSnapshot } from '@/components/expense-tracking/TodaysSnapshot';
import { AIInsights } from '@/components/expense-tracking/AIInsights';
import { CategoryManagement } from '@/components/expense-tracking/CategoryManagement';
import { ExpenseSettings } from '@/components/expense-tracking/ExpenseSettings';
import { 
  TrendingUp, 
  AlertTriangle, 
  PieChart, 
  Calendar, 
  MessageCircle, 
  Loader2,
  Plus,
  X,
  Wallet,
  DollarSign,
  Target,
  ArrowUp,
  ArrowDown,
  Upload,
  CreditCard,
  CheckCircle,
  Brain,
  Settings,
  BarChart3,
  Clock,
  Tag
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface CategorySpending {
  category: string;
  total: number;
  percentage: number;
  count: number;
}

interface SpendingAlert {
  id: string;
  category: string;
  monthly_limit: number;
  alert_threshold: number;
  is_active: boolean;
}

interface QuickExpense {
  category: string;
  amount: string;
  date: string;
  notes?: string;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Other'
];

export default function SpendingInsights() {
  const { toast } = useToast();
  const { isPremium, isPro } = usePlan();
  const { settings, loading: settingsLoading, updateSettings } = useExpenseTrackingSettings();
  const [loading, setLoading] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [previousPeriodSpending, setPreviousPeriodSpending] = useState(0);
  const [spendingAlerts, setSpendingAlerts] = useState<SpendingAlert[]>([]);
  const [currentMonthSpending, setCurrentMonthSpending] = useState<Record<string, number>>({});
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [todaySpent, setTodaySpent] = useState(0);
  const [weeklySpent, setWeeklySpent] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'reports' | 'categories' | 'settings'>('overview');
  
  // Quick expense form
  const [quickExpense, setQuickExpense] = useState<QuickExpense>({
    category: 'Food & Dining',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showGPayImport, setShowGPayImport] = useState(false);
  const [importingGPay, setImportingGPay] = useState(false);
  const [gpayFile, setGpayFile] = useState<File | null>(null);

  useEffect(() => {
    if (isPro || isPremium) {
      loadSpendingData();
      loadSpendingAlerts();
      loadRecentExpenses();
      loadTodaySpending();
    }
  }, [isPro, isPremium, selectedPeriod]);

  const loadTodaySpending = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's spending (handle missing table gracefully)
      const { data: todayExpenses, error: todayError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', todayStart.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);
      
      if (todayError && !todayError.message?.includes('does not exist') && !todayError.message?.includes('schema cache')) {
        console.error('Error loading today expenses:', todayError);
      }

      // Weekly spending
      const { data: weeklyExpenses, error: weeklyError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', weekStart.toISOString().split('T')[0]);
      
      if (weeklyError && !weeklyError.message?.includes('does not exist') && !weeklyError.message?.includes('schema cache')) {
        console.error('Error loading weekly expenses:', weeklyError);
      }

      // Monthly spending
      const { data: monthlyExpenses, error: monthlyError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0]);
      
      if (monthlyError && !monthlyError.message?.includes('does not exist') && !monthlyError.message?.includes('schema cache')) {
        console.error('Error loading monthly expenses:', monthlyError);
      }

      const todayTotal = (todayExpenses || []).reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
      const weeklyTotal = (weeklyExpenses || []).reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
      const monthlyTotal = (monthlyExpenses || []).reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);

      setTodaySpent(todayTotal);
      setWeeklySpent(weeklyTotal);
      setMonthlySpent(monthlyTotal);
    } catch (error: any) {
      console.error('Error loading today spending:', error);
    }
  };

  const loadRecentExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) {
        // If table doesn't exist, just use empty array
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          setRecentExpenses([]);
          return;
        }
        throw error;
      }
      setRecentExpenses(data || []);
    } catch (error: any) {
      console.error('Error loading recent expenses:', error);
    }
  };

  const loadSpendingData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range
      const today = new Date();
      let startDate: Date;
      let previousStartDate: Date;
      
      if (selectedPeriod === 'week') {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      } else {
        startDate = new Date(today.getFullYear(), 0, 1);
        previousStartDate = new Date(today.getFullYear() - 1, 0, 1);
      }

      // Fetch current period expenses
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      if (error) {
        // If table doesn't exist, just use empty array
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          console.warn('Expenses table not found. Please run the migration.');
          setCategorySpending([]);
          setTotalSpending(0);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Fetch previous period for comparison (silently handle if table doesn't exist)
      const { data: previousExpenses, error: previousError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', previousStartDate.toISOString().split('T')[0])
        .lt('date', startDate.toISOString().split('T')[0]);

      // Silently handle missing table
      if (previousError && !previousError.message?.includes('does not exist') && !previousError.message?.includes('schema cache')) {
        console.error('Error loading previous period expenses:', previousError);
      }

      // Calculate previous period total
      const previousTotal = (previousExpenses || []).reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
      setPreviousPeriodSpending(previousTotal);

      // Calculate category-wise spending
      const categoryMap: Record<string, { total: number; count: number }> = {};
      let total = 0;

      (expenses || []).forEach((expense: any) => {
        const category = expense.category || 'Other';
        const amount = parseFloat(expense.amount) || 0;
        
        if (!categoryMap[category]) {
          categoryMap[category] = { total: 0, count: 0 };
        }
        categoryMap[category].total += amount;
        categoryMap[category].count += 1;
        total += amount;
      });

      // Convert to array and calculate percentages
      const categoryArray: CategorySpending[] = Object.entries(categoryMap).map(([category, data]) => ({
        category,
        total: data.total,
        percentage: total > 0 ? (data.total / total) * 100 : 0,
        count: data.count,
      })).sort((a, b) => b.total - a.total);

      setCategorySpending(categoryArray);
      setTotalSpending(total);

      // Calculate current month spending by category
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const currentMonthExpenses = (expenses || []).filter((e: any) => {
        const expenseDate = new Date(e.date);
        return expenseDate >= currentMonthStart;
      });

      const currentMonthMap: Record<string, number> = {};
      currentMonthExpenses.forEach((expense: any) => {
        const category = expense.category || 'Other';
        const amount = parseFloat(expense.amount) || 0;
        currentMonthMap[category] = (currentMonthMap[category] || 0) + amount;
      });

      setCurrentMonthSpending(currentMonthMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load spending data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSpendingAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('spending_alerts' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        // Silently handle missing table
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          setSpendingAlerts([]);
          return;
        }
        throw error;
      }
      setSpendingAlerts((data || []) as any);
    } catch (error: any) {
      console.error('Error loading spending alerts:', error);
      setSpendingAlerts([]);
    }
  };

  const handleQuickAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quickExpense.amount || parseFloat(quickExpense.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setAddingExpense(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          vendor: 'Personal Expense',
          date: quickExpense.date,
          amount: parseFloat(quickExpense.amount),
          category: quickExpense.category,
          notes: quickExpense.notes || null,
          gst: 0
        });

      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          toast({
            title: 'Database Migration Required',
            description: 'Please run the expense tracking migration in Supabase SQL Editor. See apply_expense_migrations.sql',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Expense Added! 💰",
        description: `₹${quickExpense.amount} added to ${quickExpense.category}`,
      });

      // Reset form
      setQuickExpense({
        category: 'Food & Dining',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      setShowQuickAdd(false);

      // Reload data
      await loadSpendingData();
      await loadRecentExpenses();
      await loadTodaySpending();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    } finally {
      setAddingExpense(false);
    }
  };

  // Parse Google Pay CSV file
  const parseGPayCSV = (csvContent: string): any[] => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    // Try to detect headers - Google Pay exports vary
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Map common Google Pay column names
    const dateIndex = headers.findIndex(h => h.includes('date') || h.includes('time'));
    const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('rupee') || h.includes('inr'));
    const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('merchant') || h.includes('name'));
    const typeIndex = headers.findIndex(h => h.includes('type') || h.includes('transaction'));

    const transactions: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < 2) continue;

      const amount = parseFloat(values[amountIndex] || values[1] || '0');
      if (isNaN(amount) || amount <= 0) continue; // Skip invalid or credits

      const dateStr = values[dateIndex] || values[0];
      let date = new Date();
      try {
        // Try parsing various date formats
        date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          // Try DD/MM/YYYY or DD-MM-YYYY
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      } catch {
        date = new Date();
      }

      const description = values[descriptionIndex] || values[2] || 'Google Pay Transaction';

      // Smart category detection
      const descLower = description.toLowerCase();
      let category = 'Other';
      if (descLower.includes('food') || descLower.includes('restaurant') || descLower.includes('zomato') || descLower.includes('swiggy')) {
        category = 'Food & Dining';
      } else if (descLower.includes('uber') || descLower.includes('ola') || descLower.includes('metro') || descLower.includes('bus')) {
        category = 'Transport';
      } else if (descLower.includes('amazon') || descLower.includes('flipkart') || descLower.includes('shop')) {
        category = 'Shopping';
      } else if (descLower.includes('movie') || descLower.includes('netflix') || descLower.includes('spotify')) {
        category = 'Entertainment';
      } else if (descLower.includes('electricity') || descLower.includes('water') || descLower.includes('phone')) {
        category = 'Bills & Utilities';
      } else if (descLower.includes('hospital') || descLower.includes('pharmacy') || descLower.includes('medical')) {
        category = 'Healthcare';
      }

      transactions.push({
        date: format(date, 'yyyy-MM-dd'),
        amount: amount,
        category: category,
        notes: description,
        vendor: description
      });
    }

    return transactions;
  };

  const handleGPayFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file exported from Google Pay",
        variant: "destructive",
      });
      return;
    }

    setGpayFile(file);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string;
        const transactions = parseGPayCSV(csvContent);

        if (transactions.length === 0) {
            toast({
            title: "No Transactions Found",
            description: "Could not parse any transactions from the file. Please check the format.",
            variant: "destructive",
          });
          return;
        }

        setImportingGPay(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Insert transactions in batches
        let successCount = 0;
        let errorCount = 0;

        for (const transaction of transactions) {
          try {
            const { error } = await supabase
              .from('expenses')
              .insert({
                user_id: user.id,
                vendor: transaction.vendor,
                date: transaction.date,
                amount: transaction.amount,
                category: transaction.category,
                notes: transaction.notes,
                gst: 0
              });

            if (error) {
              errorCount++;
              console.error('Error importing transaction:', error);
            } else {
              successCount++;
            }
          } catch (err) {
            errorCount++;
          }
        }

        toast({
          title: "Import Complete! 🎉",
          description: `Successfully imported ${successCount} transaction${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
        });

        setGpayFile(null);
        setShowGPayImport(false);
        
        // Reload data
        await loadSpendingData();
        await loadRecentExpenses();
        await loadTodaySpending();
      } catch (error: any) {
        toast({
          title: "Import Failed",
          description: error.message || "Failed to import Google Pay transactions",
          variant: "destructive",
        });
      } finally {
        setImportingGPay(false);
    }
    };

    reader.readAsText(file);
  };

  const spendingChange = totalSpending > 0 && previousPeriodSpending > 0 
    ? ((totalSpending - previousPeriodSpending) / previousPeriodSpending) * 100 
    : 0;

  if (!isPro && !isPremium) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <BackToDashboard />
          <PremiumGuard featureName="Spending Insights" requiredPlan="pro">
            <div />
          </PremiumGuard>
        </div>
      </PageTransition>
    );
  }

  const topCategory = categorySpending[0];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <BackToDashboard />
          
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <PieChart className="h-8 w-8 text-primary" />
                Spending Insights
              </h1>
              <p className="text-muted-foreground">
                Track your expenses and stay within budget
              </p>
            </div>
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/50">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('overview')}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={activeTab === 'insights' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('insights')}
                className="gap-2"
              >
                <Brain className="h-4 w-4" />
                AI Insights
              </Button>
              <Button
                variant={activeTab === 'reports' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('reports')}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Reports
              </Button>
              <Button
                variant={activeTab === 'categories' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('categories')}
                className="gap-2"
              >
                <PieChart className="h-4 w-4" />
                Categories
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('settings')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
            <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
              <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Quick Add Expense</DialogTitle>
                    <DialogDescription>
                      Add your expense quickly - just category and amount
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleQuickAddExpense} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={quickExpense.category} 
                        onValueChange={(v) => setQuickExpense({...quickExpense, category: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={quickExpense.amount}
                        onChange={(e) => setQuickExpense({...quickExpense, amount: e.target.value})}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={quickExpense.date}
                        onChange={(e) => setQuickExpense({...quickExpense, date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Add a note..."
                        value={quickExpense.notes || ''}
                        onChange={(e) => setQuickExpense({...quickExpense, notes: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowQuickAdd(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addingExpense}>
                        {addingExpense ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Expense
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Onboarding Prompt - If budget not set */}
          {activeTab === 'overview' && settings.daily_budget === 0 && (
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Set Up Your Daily Budget
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Track your spending and stay within budget. Set your monthly income to get started.
                    </p>
                  </div>
                  <Button 
                    onClick={async () => {
                      const income = prompt('Enter your monthly take-home salary (₹):');
                      if (income && parseFloat(income) > 0) {
                        try {
                          await updateSettings({ monthly_income: parseFloat(income) });
                          toast({
                            title: 'Budget Set!',
                            description: `Your daily budget is ₹${(parseFloat(income) / 30).toLocaleString('en-IN')}/day`,
                          });
                        } catch (error) {
                          console.error('Error setting budget:', error);
                        }
                      }
                    }}
                    className="gap-2"
                  >
                    <Target className="h-4 w-4" />
                    Set Income
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Snapshot - Only show on Overview tab */}
          {activeTab === 'overview' && settings.daily_budget > 0 && (
            <TodaysSnapshot
              dailyBudget={settings.daily_budget}
              todaySpent={todaySpent}
              weeklySpent={weeklySpent}
              monthlySpent={monthlySpent}
              monthlyIncome={settings.monthly_income}
              monthlySavingsRate={settings.monthly_income > 0 
                ? ((settings.monthly_income - monthlySpent) / settings.monthly_income) * 100 
                : 0}
            />
          )}

          {/* Quick Add & Google Pay Import Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Quick Add Expense</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your daily expenses in seconds
                    </p>
                  </div>
                  <Button onClick={() => setShowQuickAdd(true)} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Add Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      Import from Google Pay
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your GPay transaction history
                    </p>
                  </div>
                  <Dialog open={showGPayImport} onOpenChange={setShowGPayImport}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="lg" className="gap-2 border-green-500/50 hover:bg-green-500/10">
                        <Upload className="h-5 w-5" />
                        Connect
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          Import Google Pay Transactions
                        </DialogTitle>
                        <DialogDescription>
                          Export your transaction history from Google Pay and upload it here
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Alert>
                          <AlertDescription className="text-sm">
                            <strong>How to export from Google Pay:</strong>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                              <li>Open Google Pay app</li>
                              <li>Go to Settings → Download transaction history</li>
                              <li>Or go to pay.google.com → Activity → Export</li>
                              <li>Select date range and download CSV</li>
                              <li>Upload the CSV file here</li>
                            </ol>
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-2">
                          <Label htmlFor="gpay-file">Upload CSV File</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="gpay-file"
                              type="file"
                              accept=".csv"
                              onChange={handleGPayFileUpload}
                              disabled={importingGPay}
                              className="flex-1"
                            />
                            {gpayFile && (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {gpayFile.name}
                              </Badge>
                            )}
                          </div>
                          {importingGPay && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Importing transactions...
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowGPayImport(false);
                              setGpayFile(null);
                            }}
                            disabled={importingGPay}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Total Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{totalSpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-2 mt-2">
                  {spendingChange !== 0 && (
                    <>
                      {spendingChange > 0 ? (
                        <ArrowUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-sm font-medium ${spendingChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {Math.abs(spendingChange).toFixed(1)}% vs previous period
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPeriod === 'week' ? 'Last 7 days' : 
                   selectedPeriod === 'month' ? 'This month' : 'This year'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Top Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {topCategory ? topCategory.category : 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {topCategory ? (
                    <>
                      ₹{topCategory.total.toLocaleString('en-IN')} ({topCategory.percentage.toFixed(1)}%)
                      <span className="block text-xs mt-1">{topCategory.count} expense{topCategory.count !== 1 ? 's' : ''}</span>
                    </>
                  ) : (
                    'No data yet'
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{spendingAlerts.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Budget alerts configured
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Spending by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Spending by Category
              </CardTitle>
              <CardDescription>
                See where your money goes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : categorySpending.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No expenses yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start tracking your spending by adding your first expense
                  </p>
                  <Button onClick={() => setShowQuickAdd(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {categorySpending.map((item) => {
                    const hasAlert = spendingAlerts.some(a => a.category === item.category);
                    const alert = spendingAlerts.find(a => a.category === item.category);
                    const currentSpending = currentMonthSpending[item.category] || 0;
                    const alertThreshold = alert ? (alert.monthly_limit * alert.alert_threshold) / 100 : null;
                    const isOverThreshold = alert && currentSpending >= alertThreshold!;

                    return (
                      <div key={item.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{item.category}</span>
                            {hasAlert && (
                              <Badge variant={isOverThreshold ? "destructive" : "secondary"} className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Alert
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">₹{item.total.toLocaleString('en-IN')}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.percentage.toFixed(1)}% • {item.count} expense{item.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                        {hasAlert && alert && (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Monthly Limit: ₹{alert.monthly_limit.toLocaleString('en-IN')}</span>
                            <span>•</span>
                            <span>Current: ₹{currentSpending.toLocaleString('en-IN')}</span>
                            {isOverThreshold && (
                              <Badge variant="destructive" className="ml-auto">
                                Over {alert.alert_threshold}%!
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions - Enhanced with Auto-Categorization */}
          {activeTab === 'overview' && recentExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Auto-categorized transactions with daily budget impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentExpenses.slice(0, 10).map((expense) => {
                    const categoryIcons: Record<string, string> = {
                      'Food & Dining': '🍽️',
                      'Transport': '🚆',
                      'Groceries': '🛒',
                      'Bills & Utilities': '📱',
                      'Entertainment': '🎬',
                      'Shopping': '👕',
                      'Healthcare': '💊',
                      'Rent & Housing': '🏠',
                      'Education': '📚',
                      'Other': '💰',
                    };
                    const icon = categoryIcons[expense.category] || '💰';
                    const expenseDate = new Date(expense.date);
                    const isToday = expenseDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={expense.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => {
                          // Could expand to show details
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-2xl">{icon}</div>
                          <div className="flex-1">
                            <div className="font-medium capitalize flex items-center gap-2">
                              {expense.category}
                              {expense.vendor && expense.vendor !== 'Personal Expense' && (
                                <span className="text-sm text-muted-foreground font-normal">
                                  • {expense.vendor}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <span>{isToday ? 'Today' : format(expenseDate, 'MMM dd, yyyy')}</span>
                              <span>•</span>
                              <span>UPI</span>
                              {expense.notes && (
                                <>
                                  <span>•</span>
                                  <span>{expense.notes}</span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Daily Budget Impact: -₹{parseFloat(expense.amount).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open category change dialog
                            }}
                          >
                            Wrong category?
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => window.location.href = '/expenses'}
                >
                  View All Expenses
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Insights Tab Content */}
          {activeTab === 'insights' && (
            <AIInsights
              monthlyIncome={settings.monthly_income}
              monthlySpent={monthlySpent}
              categorySpending={categorySpending}
              todaySpent={todaySpent}
              dailyBudget={settings.daily_budget}
            />
          )}

          {/* Reports Tab Content */}
          {activeTab === 'reports' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Reports
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of your spending patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Reports Coming Soon!</strong>
                    <p className="mt-2 text-sm">
                      Export detailed monthly reports, view category breakdowns, and track your financial progress over time.
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Categories Tab Content */}
          {activeTab === 'categories' && <CategoryManagement />}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <ExpenseSettings settings={settings} updateSettings={updateSettings} />
          )}

          {/* Spending Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Spending Alerts
              </CardTitle>
              <CardDescription>
                Get WhatsApp alerts when approaching your spending limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {spendingAlerts.length === 0 ? (
                <Alert>
                  <MessageCircle className="h-4 w-4" />
                  <AlertDescription>
                    No spending alerts configured. Set up alerts to get notified via WhatsApp when you're approaching your budget limits.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {spendingAlerts.map((alert) => {
                    const currentSpending = currentMonthSpending[alert.category] || 0;
                    const percentage = (currentSpending / alert.monthly_limit) * 100;
                    const thresholdPercentage = (alert.alert_threshold / 100) * alert.monthly_limit;
                    const isOverThreshold = currentSpending >= thresholdPercentage;

                    return (
                      <div key={alert.id} className={`p-4 border rounded-lg ${isOverThreshold ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{alert.category}</span>
                            {isOverThreshold && (
                              <Badge variant="destructive">Alert Triggered</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">
                              ₹{currentSpending.toFixed(2)} / ₹{alert.monthly_limit.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}% of limit
                            </div>
                          </div>
                        </div>
                        <Progress value={Math.min(percentage, 100)} className="mb-2" />
                        <div className="text-xs text-muted-foreground">
                          Alert at {alert.alert_threshold}% (₹{thresholdPercentage.toFixed(2)})
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}