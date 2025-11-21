import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthCallbackHandler from '@/components/auth/AuthCallbackHandler';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const mode = searchParams.get('mode');

  useEffect(() => {
    // Handle auth callback with Auth V2 handler
    if (mode === 'callback') {
      console.log('🔄 Handling auth callback...');
      // Auth V2 uses dedicated callback handler
      return;
    }
    
    // Handle password reset mode
    if (mode === 'reset') {
      // Allow users to proceed with password reset even if authenticated
      return;
    }
    
    // Only redirect if we have a confirmed user and not loading
    if (user && !loading) {
      console.log('🔄 User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, mode]);

  // Handle callback mode with dedicated handler
  if (mode === 'callback') {
    return <AuthCallbackHandler />;
  }

  // Don't render auth form if user is already authenticated (unless in password reset mode)
  if (user && mode !== 'reset') {
    return null;
  }

  // Show password reset success message if in reset mode
  if (mode === 'reset') {
    return (
      <div className="min-h-screen bg-feature-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Password Reset Complete</h2>
            <p className="text-muted-foreground mb-4">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <button
              onClick={() => {
                navigate('/auth', { replace: true });
              }}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleTakeToDashboard = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('demo_dashboard_access', 'true');
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-feature-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur rounded-3xl shadow-2xl p-8 text-center space-y-6 border border-white/20">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v18" />
              <path d="M5 12h14" />
            </svg>
          </div>

          <div className="space-y-3">
            <p className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
              Instant Access
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              You're all set to explore InvoiceFlow
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              We've temporarily opened the gates. Tap the button below and jump straight into the dashboard experience.
            </p>
          </div>

          <button
            onClick={handleTakeToDashboard}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-lg font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-200"
          >
            Take me to the dashboard
          </button>

          <p className="text-xs text-muted-foreground">
            Need sign-in restored later? Just let us know.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;