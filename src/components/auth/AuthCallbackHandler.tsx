import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AuthCallbackHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('OAuth and magic-link callbacks are not available. Please sign in with email and password.');
  const { toast } = useToast();
  const { track } = useAnalytics();

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error);
      track('auth_error', { kind: 'callback_error', error, description: errorDescription });
      return;
    }

    setStatus('error');
    track('auth_error', { kind: 'callback_not_available' });
    toast({
      title: 'Sign-in method not available',
      description: errorMessage,
      variant: 'destructive',
    });
  }, [searchParams, track, toast, errorMessage]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === 'loading' ? (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing authentication...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-lg font-semibold">Authentication unavailable</h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => navigate('/auth', { replace: true })}>
                Go to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallbackHandler;
