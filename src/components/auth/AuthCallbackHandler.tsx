import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AuthCallbackHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const { track } = useAnalytics();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing auth callback...');
        
        const url = new URL(window.location.href);
        const next = searchParams.get('next') || '/dashboard';
        
        // Get the access token and other params from the URL
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle errors first
        if (error) {
          console.error('❌ Auth callback error:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || error);
          track('auth_error', { kind: 'callback_error', error, description: errorDescription });
          return;
        }

        // Branch 1: Handle hash-based tokens (#access_token + refresh_token)
        const tokenHash = window.location.hash;
        if (tokenHash && tokenHash.includes('access_token')) {
          console.log('🔄 Branch: Hash-based tokens');
          
          const hashParams = new URLSearchParams(tokenHash.substring(1));
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');
          
          if (hashAccessToken && hashRefreshToken) {
            const { data, error: hashError } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });

            if (hashError) {
              console.error('❌ Hash session error:', hashError);
              setStatus('error');
              setErrorMessage(hashError.message);
              track('auth_error', { kind: 'hash_session_error', error: hashError.message });
              return;
            }

            if (data.session) {
              console.log('✅ Hash-based session established');
              setStatus('success');
              track('auth_callback_success', { method: 'hash' });
              
              toast({
                title: "You're in—welcome back!",
                description: "Authentication completed successfully",
              });

              setTimeout(() => {
                navigate(next, { replace: true });
              }, 1500);
              return;
            }
          }
        }

        // Branch 2: Handle code flow (?code=...)
        const code = searchParams.get('code');
        if (code) {
          console.log('🔄 Branch: Code flow');
          
          const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (codeError) {
            console.error('❌ Code exchange error:', codeError);
            setStatus('error');
            setErrorMessage(codeError.message);
            track('auth_error', { kind: 'code_exchange_error', error: codeError.message });
            return;
          }

          if (data.session) {
            console.log('✅ Code-based session established');
            setStatus('success');
            track('auth_callback_success', { method: 'code' });
            
            toast({
              title: "You're in—welcome back!",
              description: "Successfully signed in",
            });

            setTimeout(() => {
              navigate(next, { replace: true });
            }, 1500);
            return;
          }
        }

        // Branch 3: Handle magic link fallback (?type=magiclink&token_hash=...)
        const type = searchParams.get('type');
        const tokenHashParam = searchParams.get('token_hash');
        
        if (type === 'magiclink' && tokenHashParam) {
          console.log('🔄 Branch: Magic link token_hash');
          
          const email = localStorage.getItem('login_email');
          
          if (!email) {
            console.warn('⚠️ No email found in localStorage for magic link verification');
            setStatus('error');
            setErrorMessage('Please enter your email to finish sign-in');
            return;
          }

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            type: 'magiclink',
            token_hash: tokenHashParam,
            email,
          });

          if (verifyError) {
            console.error('❌ Magic link verification error:', verifyError);
            setStatus('error');
            setErrorMessage(verifyError.message);
            track('auth_error', { kind: 'magiclink_verify_error', error: verifyError.message });
            return;
          }

          if (data.session) {
            console.log('✅ Magic link session established');
            setStatus('success');
            track('auth_magiclink_consumed', { success: true });
            
            // Clear stored email
            localStorage.removeItem('login_email');
            
            toast({
              title: "You're in—welcome back!",
              description: "Successfully signed in with magic link",
            });

            setTimeout(() => {
              navigate(next, { replace: true });
            }, 1500);
            return;
          }
        }

        // Branch 4: Handle query param tokens (legacy support)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('🔄 Branch: Query param tokens');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            setStatus('error');
            setErrorMessage(sessionError.message);
            track('auth_error', { kind: 'session_error', error: sessionError.message });
            return;
          }

          if (data.session) {
            console.log('✅ Query param session established');
            setStatus('success');
            track('auth_callback_success', { method: 'query_params' });
            
            toast({
              title: "You're in—welcome back!",
              description: "Successfully signed in",
            });

            setTimeout(() => {
              navigate(next, { replace: true });
            }, 1500);
            return;
          }
        }

        // If we get here, no valid tokens were found
        console.warn('⚠️ No valid auth tokens found in callback');
        setStatus('error');
        setErrorMessage('Invalid or expired authentication link');
        track('auth_error', { kind: 'no_tokens_found' });

      } catch (error: any) {
        console.error('❌ Callback handling error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
        track('auth_error', { kind: 'callback_exception', error: error.message });
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, toast, track]);

  const handleRetry = () => {
    navigate('/auth', { replace: true });
  };

  const handleResendMagicLink = async () => {
    const email = localStorage.getItem('login_email');
    
    if (email) {
      try {
        const redirectTo = `${window.location.origin}/auth/callback`;
        await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo }
        });
        
        toast({
          title: "Magic link sent!",
          description: "Check your email—click the link to finish sign-in.",
        });
      } catch (error: any) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      navigate('/auth?tab=magiclink', { replace: true });
      toast({
        title: "Ready to resend",
        description: "Enter your email to get a fresh magic link",
      });
    }
  };

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-strong border-0 backdrop-blur-sm bg-background/95">
          <CardContent className="text-center py-8">
            {status === 'loading' && (
              <>
                <div className="mb-4">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                </div>
                <h2 className="text-xl font-bold mb-2">Signing you in...</h2>
                <p className="text-muted-foreground">
                  Just a moment while we complete your authentication
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mb-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2">Welcome back!</h2>
                <p className="text-muted-foreground">
                  Authentication successful. Redirecting to your dashboard...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-4">
                  <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2">Authentication failed</h2>
                <p className="text-muted-foreground mb-4">
                  {errorMessage || "That didn't work. We've reset things—try again."}
                </p>
                <div className="space-y-2">
                  <Button onClick={handleRetry} className="w-full">
                    Try Again
                  </Button>
                  {errorMessage.includes('expired') && (
                    <Button onClick={handleResendMagicLink} variant="outline" className="w-full">
                      Get New Magic Link
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthCallbackHandler;