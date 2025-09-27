import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const refreshSession = async () => {
      if (!user && !loading) {
        setIsRefreshing(true);
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.log('Session refresh failed:', error.message);
          } else if (data.session) {
            console.log('Session refreshed successfully');
          }
        } catch (error) {
          console.log('Session refresh error:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    refreshSession();
  }, [user, loading]);

  // Show loading while checking auth or refreshing
  if (loading || isRefreshing) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, show fallback or redirect
  if (!user) {
    return fallback || null;
  }

  return <>{children}</>;
};

export default AuthGuard;