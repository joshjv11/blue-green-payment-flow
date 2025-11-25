import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type SignInFormData = z.infer<typeof signInSchema>;

interface SimpleAuthFormProps {
  onSuccess?: () => void;
}

export default function SimpleAuthForm({ onSuccess }: SimpleAuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const navigate = useNavigate();
  const { signUp, signIn, resetPassword } = useAuth();
  const { toast } = useToast();

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const result = await signUp(data.email, data.password);
      
      if (result.requiresEmailConfirmation) {
        // Email confirmation is enabled
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please verify your email before signing in.',
        });
        setMode('signin');
      } else {
        // Email confirmation is disabled - user is auto-logged in
        toast({
          title: 'Welcome to InvoiceFlow!',
          description: 'Your account has been created successfully.',
        });
        
        // Wait for session to be established
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ Signup session confirmed, navigating to dashboard');
            onSuccess?.();
            navigate('/dashboard', { replace: true });
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Fallback navigation
        onSuccess?.();
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      // Error handling is done in useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    setAuthError('');
    try {
      await signIn(data.email, data.password);
      
      // Wait for auth state to update before navigating
      // Check session directly to ensure it's established
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Session confirmed, navigating to dashboard');
          onSuccess?.();
          navigate('/dashboard', { replace: true });
          return;
        }
        // Wait 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // If we get here, session wasn't established but signIn didn't throw
      // Try navigating anyway - the auth guard will handle it
      console.warn('⚠️ Session not immediately available, navigating anyway');
      onSuccess?.();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      // Show subtle inline error instead of toast
      if (error.message?.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password');
      } else if (error.message?.includes('Email not confirmed')) {
        setAuthError('Please verify your email before signing in');
      } else {
        setAuthError('Unable to sign in. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = signInForm.getValues('email');
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(email);
      toast({
        title: 'Check your email',
        description: 'Password reset instructions have been sent to your email.',
      });
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Unable to send reset email',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Sign in to access your dashboard'
              : 'Create your account in seconds — no credit card required.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {mode === 'signup' ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  {...signUpForm.register('email')}
                  className="h-11"
                />
                {signUpForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.email.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    We'll never share your email.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    {...signUpForm.register('password')}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  {...signInForm.register('email')}
                  className="h-11"
                />
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...signInForm.register('password')}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={signInForm.watch('rememberMe')}
                    onCheckedChange={(checked) =>
                      signInForm.setValue('rememberMe', checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>

              {authError && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
