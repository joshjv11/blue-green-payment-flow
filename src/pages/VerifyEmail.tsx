import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyEmail } from '@/lib/endpoints/auth';
import { bootstrapSession } from '@/lib/apiClient';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await verifyEmail(token);
        await bootstrapSession();
        if (!cancelled) setStatus('success');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {status === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
              <CardTitle>Verifying your email</CardTitle>
              <CardDescription>Please wait…</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <CardTitle>Email verified</CardTitle>
              <CardDescription>Your email address has been confirmed. You can now use all features.</CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle>Verification failed</CardTitle>
              <CardDescription>
                This link is invalid or has expired. Sign in and request a new verification email from settings.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {status !== 'loading' && (
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/auth">Continue to sign in</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
