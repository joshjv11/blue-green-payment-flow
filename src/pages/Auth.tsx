import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AuthCallbackHandler from '@/components/auth/AuthCallbackHandler';
import SimpleAuthForm from '@/components/auth/SimpleAuthForm';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const mode = searchParams.get('mode');
  const [googleLoading, setGoogleLoading] = useState(false);

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
      // Small delay to ensure session is fully established
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100);
    }
  }, [user, loading, navigate, mode]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?mode=callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // OAuth will redirect, no need to do anything else here
      console.log('✅ Google OAuth initiated successfully');
    } catch (error: any) {
      console.error('❌ Google OAuth error:', error);
      toast({
        title: 'Sign-in failed',
        description: error.message || 'Failed to sign in with Google. Please try again.',
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  };

  const handleTakeToDashboard = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('demo_dashboard_access', 'true');
    }
    navigate('/dashboard', { replace: true });
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Google OAuth Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          variant="outline"
          className="w-full h-14 text-base font-semibold border-2 bg-background/80 backdrop-blur-sm hover:bg-accent hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          {googleLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background/80 backdrop-blur-sm px-4 py-1 rounded-full text-muted-foreground font-medium">Or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <SimpleAuthForm
          onSuccess={() => {
            navigate('/dashboard');
          }}
        />

        {/* Demo Access Button (smaller, at bottom) */}
        <div className="pt-4 border-t border-border/50">
          <Button
            onClick={handleTakeToDashboard}
            variant="ghost"
            className="w-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-300"
          >
            Take me to dashboard (demo)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;