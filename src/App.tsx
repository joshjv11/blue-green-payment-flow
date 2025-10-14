import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { PlanProvider } from '@/contexts/PlanContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import DebugInfo from '@/components/DebugInfo';
import MobileOptimizer from '@/components/MobileOptimizer';
import { PageTransition } from '@/components/PageTransition';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Dashboard from './pages/Dashboard';
import Bills from './pages/Bills';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import GSTSummary from './pages/GSTSummary';
import Exports from './pages/Exports';
import Reports from './pages/Reports';
import TaxSettings from './pages/TaxSettings';
import Expenses from './pages/Expenses';
import FinancialReports from './pages/FinancialReports';
import Upgrade from './pages/Upgrade';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';
import AdminUserPlans from './pages/AdminUserPlans';
import AdminDbHealth from './pages/AdminDbHealth';
import AdminLogs from './pages/AdminLogs';
import NotFound from './pages/NotFound';

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
            <PageTransition><Sales /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchases" 
        element={
          <ProtectedRoute>
            <PageTransition><Purchases /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory" 
        element={
          <ProtectedRoute>
            <PageTransition><Inventory /></PageTransition>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/gst-summary" 
        element={
          <ProtectedRoute>
            <PageTransition><GSTSummary /></PageTransition>
          </ProtectedRoute>
        } 
      />
        <Route 
          path="/reports/tax" 
          element={
            <ProtectedRoute>
              <PageTransition><Reports /></PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports/financial" 
          element={
            <ProtectedRoute>
              <PageTransition><FinancialReports /></PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/expenses" 
          element={
            <ProtectedRoute>
              <PageTransition><Expenses /></PageTransition>
            </ProtectedRoute>
          } 
        />
      <Route 
        path="/exports"
        element={
          <ProtectedRoute>
            <PageTransition><Exports /></PageTransition>
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
        path="/upgrade"
        element={
          <ProtectedRoute>
            <PageTransition><Upgrade /></PageTransition>
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1">
          <header className="sticky top-0 z-50 h-14 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1">
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
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
