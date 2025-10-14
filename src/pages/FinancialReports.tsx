import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import UpgradeModal from '@/components/UpgradeModal';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { ProfitLossStatement } from '@/components/reports/ProfitLossStatement';
import { BalanceSheet } from '@/components/reports/BalanceSheet';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import {
  DateRange,
  getDateRangePresets,
  calculateProfitLoss,
  calculateBalanceSheet,
  calculateCashFlow,
  ProfitLossData,
  BalanceSheetData,
  CashFlowData
} from '@/utils/financialCalculations';
import {
  exportProfitLossToCSV,
  exportBalanceSheetToCSV,
  exportCashFlowToCSV,
  exportProfitLossToPDF,
  exportBalanceSheetToPDF,
  exportCashFlowToPDF
} from '@/utils/reportExports';
import { format } from 'date-fns';

const FinancialReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { plan } = useSupabasePlan();
  const isPro = plan === 'pro';

  const [dateRange, setDateRange] = useState<DateRange>(getDateRangePresets()[0]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('profit-loss');

  // Data states
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Calculated data
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);

  useEffect(() => {
    if (user && isPro) {
      fetchAllData();
    }
  }, [user, isPro, dateRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');

      // Fetch sales orders
      const { data: salesData, error: salesError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('user_id', user!.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (salesError) throw salesError;

      // Fetch purchase orders
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('user_id', user!.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (purchasesError) throw purchasesError;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Fetch products for inventory value
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user!.id);

      if (productsError) throw productsError;

      setSales(salesData || []);
      setPurchases(purchasesData || []);
      setExpenses(expensesData || []);
      setProducts(productsData || []);

      // Calculate reports
      const pnl = calculateProfitLoss(salesData || [], purchasesData || [], expensesData || []);
      const bs = calculateBalanceSheet(productsData || [], salesData || [], purchasesData || []);
      const cf = calculateCashFlow(salesData || [], purchasesData || [], expensesData || []);

      setProfitLossData(pnl);
      setBalanceSheetData(bs);
      setCashFlowData(cf);

    } catch (error: any) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (activeTab === 'profit-loss' && profitLossData) {
        exportProfitLossToCSV(profitLossData, dateRange);
      } else if (activeTab === 'balance-sheet' && balanceSheetData) {
        exportBalanceSheetToCSV(balanceSheetData, dateRange);
      } else if (activeTab === 'cash-flow' && cashFlowData) {
        exportCashFlowToCSV(cashFlowData, dateRange);
      }

      toast({
        title: 'Exported',
        description: 'Report exported to CSV successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = () => {
    try {
      if (activeTab === 'profit-loss' && profitLossData) {
        exportProfitLossToPDF(profitLossData, dateRange);
      } else if (activeTab === 'balance-sheet' && balanceSheetData) {
        exportBalanceSheetToPDF(balanceSheetData, dateRange);
      } else if (activeTab === 'cash-flow' && cashFlowData) {
        exportCashFlowToPDF(cashFlowData, dateRange);
      }

      toast({
        title: 'Exported',
        description: 'Report exported to PDF successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!isPro) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Card className="shadow-lg border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6" />
                  Financial Reports
                </CardTitle>
                <CardDescription>
                  Professional accounting statements: P&L, Balance Sheet, Cash Flow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white rounded-full p-3 shadow-sm">
                      <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Premium Feature</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get complete financial clarity with auto-generated P&L statements, balance sheets, and cash flow reports. Perfect for SMB owners who want CA-level insights without the monthly fees.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                        <li>✓ Profit & Loss Statement</li>
                        <li>✓ Balance Sheet</li>
                        <li>✓ Cash Flow Statement</li>
                        <li>✓ Export to PDF & Excel</li>
                        <li>✓ Date range filtering</li>
                        <li>✓ Visual charts & insights</li>
                      </ul>
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

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Financial Reports</h1>
              <p className="text-muted-foreground mt-1">
                Professional accounting statements for your business
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
            </div>
          </div>

          {/* Date Range Filter */}
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          </TabsList>

          <TabsContent value="profit-loss" className="mt-6">
            {profitLossData && (
              <ProfitLossStatement data={profitLossData} loading={loading} />
            )}
          </TabsContent>

          <TabsContent value="balance-sheet" className="mt-6">
            {balanceSheetData && (
              <BalanceSheet data={balanceSheetData} loading={loading} />
            )}
          </TabsContent>

          <TabsContent value="cash-flow" className="mt-6">
            {cashFlowData && (
              <CashFlowStatement data={cashFlowData} loading={loading} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default FinancialReports;
