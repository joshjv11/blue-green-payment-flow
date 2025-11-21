import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute = ({ children, redirectTo = '/auth' }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasRedirected = useRef(false);

  const allowDemoDashboard =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('demo_dashboard_access') === 'true' &&
    location.pathname === '/dashboard';

  // Prevent multiple redirects
  useEffect(() => {
    hasRedirected.current = false;

    // Clean up demo bypass if user navigates elsewhere
    if (typeof window !== 'undefined' && location.pathname !== '/dashboard') {
      window.localStorage.removeItem('demo_dashboard_access');
    }
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !allowDemoDashboard) {
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      return <Navigate to={redirectTo} replace />;
    }
    return null;
  }

  return <div className="min-h-screen bg-background">{children}</div>;
};

export default ProtectedRoute;