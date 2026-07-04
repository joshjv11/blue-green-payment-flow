import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SimpleAuthForm from '@/components/auth/SimpleAuthForm';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (mode === 'reset') {
      navigate('/reset-password', { replace: true });
      return;
    }
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, mode]);

  const handleDemoAccess = () => {
    if (!import.meta.env.DEV) return;
    window.localStorage.setItem('demo_dashboard_access', 'true');
    navigate('/dashboard', { replace: true });
  };

  if (user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <SimpleAuthForm onSuccess={() => navigate('/dashboard', { replace: true })} />

        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-border/50 text-center">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Dev: preview dashboard without signing in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
