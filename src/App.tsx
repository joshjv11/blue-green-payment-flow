import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { PlanProvider } from '@/contexts/PlanContext';
import { ThemeProvider } from 'next-themes';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import DebugInfo from '@/components/DebugInfo';
import MobileOptimizer from '@/components/MobileOptimizer';
import { PageTransition } from '@/components/PageTransition';
import ReturnHomeButton from '@/components/ui/ReturnHomeButton';
import { SecretAdminLock } from '@/components/SecretAdminLock';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Dashboard from './pages/Dashboard';
import Bills from './pages/Bills';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Sales from './pages/Sales';
import SalesList from './pages/SalesList';
import SalesV2 from './pages/SalesV2';
import WhatsAppDashboard from './pages/WhatsAppDashboard';
import Purchases from './pages/Purchases';
import PurchasesV2 from './pages/PurchasesV2';
import PurchasesList from './pages/PurchasesList';
import Inventory from './pages/Inventory';
import InventoryLedger from './pages/InventoryLedger';
import GSTSummary from './pages/GSTSummary';
import Exports from './pages/Exports';
import Reports from './pages/Reports';
import TaxSettings from './pages/TaxSettings';
import EInvoiceSettings from './pages/EInvoiceSettings';
import GSTRFiling from './pages/GSTRFiling';
import GSTDashboard from './pages/GSTDashboard';
import SavingsGoals from './pages/SavingsGoals';
import EMIManager from './pages/EMIManager';
import SpendingInsights from './pages/SpendingInsights';
import Expenses from './pages/Expenses';
import FinancialReports from './pages/FinancialReports';
import AICoach from './pages/AICoach';
import Upgrade from './pages/Upgrade';
import Payment from './pages/Payment';
import Admin from './pages/Admin';
import AdminCMS from './pages/AdminCMS';
import AdminUsers from './pages/AdminUsers';
import AdminUserPlans from './pages/AdminUserPlans';
import AdminPlans from './pages/AdminPlans';
import AdminDbHealth from './pages/AdminDbHealth';
import AdminLogs from './pages/AdminLogs';
import ComponentPlayground from './pages/ComponentPlayground';
import NotFound from './pages/NotFound';
import { RequirePlan } from './components/RequirePlan';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PageTransition><Index /></PageTransition>} />
      <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
      <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
      <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <PageTransition><Dashboard /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bills" 
        element={
          <ProtectedRoute>
            <PageTransition><Bills /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <PageTransition><Analytics /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Sales Orders">
              <PageTransition><Sales /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales-list" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Sales Orders">
              <PageTransition><SalesList /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales-v2" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Sales Orders">
              <PageTransition><SalesV2 /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/whatsapp" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="pro" featureName="WhatsApp Business Integration">
              <PageTransition><WhatsAppDashboard /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchases"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Purchase Orders">
              <PageTransition><Purchases /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchases-list"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Purchase Orders">
              <PageTransition><PurchasesList /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchases-v2"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Purchase Orders">
              <PageTransition><PurchasesV2 /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/expenses" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Expense Management">
              <PageTransition><Expenses /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Inventory Management">
              <PageTransition><Inventory /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory-ledger" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Inventory Management">
              <PageTransition><InventoryLedger /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ai-coach" 
        element={
          <ProtectedRoute>
            <PageTransition><AICoach /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/gst-summary" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="GST/VAT Summary">
              <PageTransition><GSTSummary /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports/tax" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Tax Reports">
              <PageTransition><Reports /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports/financial" 
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Financial Reports">
              <PageTransition><FinancialReports /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/exports"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="Exports">
              <PageTransition><Exports /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PageTransition><Settings /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/settings/taxes"
        element={
          <ProtectedRoute>
            <PageTransition><TaxSettings /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/gst"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="GST Dashboard">
              <PageTransition><GSTDashboard /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/settings/e-invoice"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="E-Invoice Settings">
              <PageTransition><EInvoiceSettings /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/gstr-filing"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="premium" featureName="GSTR Filing">
              <PageTransition><GSTRFiling /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/savings-goals"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="pro" featureName="Savings Goals">
              <PageTransition><SavingsGoals /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/emi-manager"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="pro" featureName="EMI Manager">
              <PageTransition><EMIManager /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/spending-insights"
        element={
          <ProtectedRoute>
            <RequirePlan requiredPlan="pro" featureName="Spending Insights">
              <PageTransition><SpendingInsights /></PageTransition>
            </RequirePlan>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/upgrade"
        element={
          <ProtectedRoute>
            <PageTransition><Upgrade /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute>
            <PageTransition><Payment /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/admin-cms"
        element={
          <PageTransition><AdminCMS /></PageTransition>
        } 
      />
      <Route 
        path="/admin"
        element={
          <ProtectedRoute>
            <PageTransition><Admin /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute>
            <PageTransition><AdminUserPlans /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/plans" 
        element={
          <ProtectedRoute>
            <PageTransition><AdminPlans /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/db-health" 
        element={
          <ProtectedRoute>
            <PageTransition><AdminDbHealth /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/logs" 
        element={
          <ProtectedRoute>
            <PageTransition><AdminLogs /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/component-playground"
        element={
          <ProtectedRoute>
            <PageTransition><ComponentPlayground /></PageTransition>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
    </Routes>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = window.location.pathname;
  const isPublicPage = ['/', '/auth', '/terms', '/privacy'].includes(location);

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Always render sidebar for protected routes - never hide it
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full relative">
        {/* Sidebar - Always rendered, never conditionally hidden */}
        <div className="relative z-50">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="sticky top-0 z-40 h-14 md:h-16 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-4 safe-area-inset-top">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 relative overflow-x-hidden">
            <ReturnHomeButton />
            <SecretAdminLock />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <PlanProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <DebugInfo />
              <BrowserRouter>
                <MobileOptimizer />
                <AppLayout>
                  <AppRoutes />
                </AppLayout>
              </BrowserRouter>
            </TooltipProvider>
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
