import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Plus } from 'lucide-react';
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { ExpensesTable } from '@/components/ExpensesTable';
import { ExpenseCategoryFilter } from '@/components/ExpenseCategoryFilter';
import { ExpenseChart } from '@/components/ExpenseChart';
import { exportExpensesToCSV, exportExpensesToPDF } from '@/utils/expenseExport';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import UpgradeModal from '@/components/UpgradeModal';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BackToDashboard } from '@/components/BackToDashboard';

export interface Expense {
  id: string;
  user_id: string;
  vendor: string;
  date: string;
  amount: number;
  gst: number;
  category: string;
  attachment_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const EXPENSE_CATEGORIES = [
  'All',
  'Travel',
  'Utilities',
  'Office Supplies',
  'Marketing',
  'Software',
  'Food & Dining',
  'Professional Services',
  'Other'
];

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSupabasePlan();
  const isPro = isPremium;
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchExpenses();

      // PostgREST has no realtime WebSocket support; mutations refresh state directly.
    }
  }, [user]);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredExpenses(expenses);
    } else {
      setFilteredExpenses(expenses.filter(e => e.category === selectedCategory));
    }
  }, [expenses, selectedCategory]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching expenses',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseAdded = () => {
    fetchExpenses();
    setShowUploadModal(false);
  };

  const handleExportCSV = () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }
    exportExpensesToCSV(filteredExpenses);
    toast({
      title: 'Exported',
      description: 'Expenses exported to CSV successfully',
    });
  };

  const handleExportPDF = () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }
    exportExpensesToPDF(filteredExpenses);
    toast({
      title: 'Exported',
      description: 'Expenses exported to PDF successfully',
    });
  };

  const calculateMonthlyTotal = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return filteredExpenses
      .filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  };

  if (!isPro) {
    return (
      <>
        <div className="container mx-auto px-4 py-8">
          <BackToDashboard />
          <div className="max-w-3xl mx-auto">
            <Card className="shadow-lg border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Upload className="h-6 w-6" />
                  Expense Tracker
                </CardTitle>
                <CardDescription>
                  Track expenses with OCR receipt scanning, categorization, and detailed reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white rounded-full p-3 shadow-sm">
                      <Upload className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Premium Feature</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade to Premium to unlock expense tracking with OCR receipt scanning, automatic categorization, and detailed reports.
                      </p>
                      <Button onClick={() => setShowUpgradeModal(true)}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <UpgradeModal
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
          />
        </div>
      </>
    );
  }

  const monthlyTotal = calculateMonthlyTotal();

  return (
    <>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <BackToDashboard />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Expense Tracker</h1>
            <p className="text-muted-foreground mt-1">
              Manage your expenses with OCR-powered receipt scanning
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Receipt
            </Button>
          </div>
        </div>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
            <CardDescription>{format(new Date(), 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{monthlyTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total expenses from {filteredExpenses.length} transaction(s)
            </p>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <ExpenseCategoryFilter
          categories={EXPENSE_CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Expense Distribution Chart */}
        {expenses.length > 0 && (
          <ExpenseChart expenses={filteredExpenses} />
        )}

        {/* Expenses Table */}
        <ExpensesTable
          expenses={filteredExpenses}
          loading={loading}
          onRefresh={fetchExpenses}
        />

        {/* Upload Modal */}
        {showUploadModal && (
          <ReceiptUpload
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleExpenseAdded}
          />
        )}

        {/* Upgrade Modal */}
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
        />
      </div>
    </>
  );
};

export default Expenses;
