import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { PlanProvider } from '@/contexts/PlanContext';
import { ThemeProvider } from 'next-themes';
import { HorizontalNavbar } from '@/components/HorizontalNavbar';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import DebugInfo from '@/components/DebugInfo';
import MobileOptimizer from '@/components/MobileOptimizer';
import { PageTransition } from '@/components/PageTransition';
import ReturnHomeButton from '@/components/ui/ReturnHomeButton';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useLoginTracking } from '@/hooks/useLoginTracking';
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
import Purchases from './pages/Purchases';
import PurchasesV2 from './pages/PurchasesV2';
import PurchasesList from './pages/PurchasesList';
import GSTSummary from './pages/GSTSummary';
import Reports from './pages/Reports';
import TaxSettings from './pages/TaxSettings';
import GSTDashboard from './pages/GSTDashboard';
import Expenses from './pages/Expenses';
import FinancialReports from './pages/FinancialReports';
import Upgrade from './pages/Upgrade';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';
import AdminUserPlans from './pages/AdminUserPlans';
import AdminPlans from './pages/AdminPlans';
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
        path="/payment/success"
        element={
          <ProtectedRoute>
            <PageTransition><PaymentSuccess /></PageTransition>
          </ProtectedRoute>
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
      <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
    </Routes>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = window.location.pathname;
  const isPublicPage = ['/', '/auth', '/terms', '/privacy'].includes(location);

  // Track page views and logins
  usePageTracking();
  useLoginTracking();

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Use horizontal navbar instead of sidebar
  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Horizontal Navigation Bar */}
      <HorizontalNavbar />
      <main className="flex-1 relative overflow-x-hidden">
        <ReturnHomeButton />
        {children}
      </main>
    </div>
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
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
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
