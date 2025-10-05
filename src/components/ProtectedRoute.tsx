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

  // Prevent multiple redirects
  useEffect(() => {
    hasRedirected.current = false;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : !user && !hasRedirected.current ? (
        <>
          {(hasRedirected.current = true)}
          <Navigate to={redirectTo} replace />
        </>
      ) : (
        children
      )}
    </div>
  );
};

export default ProtectedRoute;