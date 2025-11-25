import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute = ({ children, redirectTo = '/auth' }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const [checkingSession, setCheckingSession] = useState(false);

  const allowDemoDashboard =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('demo_dashboard_access') === 'true' &&
    location.pathname === '/dashboard';

  // Double-check session if user is null but not loading
  useEffect(() => {
    const verifySession = async () => {
      if (!user && !loading && !checkingSession) {
        setCheckingSession(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ Session found on protected route check');
            // Session exists, auth state will update via listener
          }
        } catch (error) {
          console.error('Error checking session:', error);
        } finally {
          setCheckingSession(false);
        }
      }
    };

    verifySession();
  }, [user, loading, checkingSession]);

  // Prevent multiple redirects
  useEffect(() => {
    hasRedirected.current = false;

    // Clean up demo bypass if user navigates elsewhere
    if (typeof window !== 'undefined' && location.pathname !== '/dashboard') {
      window.localStorage.removeItem('demo_dashboard_access');
    }
  }, [location.pathname]);

  if (loading || checkingSession) {
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