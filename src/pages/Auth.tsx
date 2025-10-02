import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SimpleAuthForm from '@/components/auth/SimpleAuthForm';
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

  const handleAuthSuccess = () => {
    // The useEffect above will handle the redirect
    console.log('✅ Auth success callback triggered');
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-feature-gradient flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-white text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

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

  // Use Simple Email/Password Auth Form
  return <SimpleAuthForm onSuccess={handleAuthSuccess} />;
};

export default Auth;