import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Clear errors when switching modes
  useEffect(() => {
    setAuthError('');
    signUpForm.reset();
    signInForm.reset();
  }, [mode, signUpForm, signInForm]);

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const result = await signUp(data.email, data.password);

      if (result.requiresEmailConfirmation) {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please verify your email before signing in.',
        });
        setMode('signin');
      } else {
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
            onSuccess?.();
            navigate('/dashboard', { replace: true });
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

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

      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          onSuccess?.();
          navigate('/dashboard', { replace: true });
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      onSuccess?.();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
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
        description: 'Please enter your email address to reset your password',
        variant: 'destructive',
      });
      signInForm.setFocus('email');
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
    <div className="w-full max-w-md mx-auto">
      <Card className="border border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl overflow-hidden hover:shadow-3xl transition-shadow duration-500">
        <CardHeader className="space-y-3 text-center pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {mode === 'signin'
                  ? 'Enter your credentials to access your account'
                  : 'Get started with InvoiceFlow today'}
              </CardDescription>
            </motion.div>
          </AnimatePresence>
        </CardHeader>

        <CardContent className="p-6 pt-4">
          <AnimatePresence mode="wait">
            {mode === 'signup' ? (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={signUpForm.handleSubmit(handleSignUp)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="username"
                      autoFocus
                      {...signUpForm.register('email')}
                      className="h-12 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-all duration-300"
                    />
                  {signUpForm.formState.errors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {signUpForm.formState.errors.email.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      {...signUpForm.register('password')}
                      className="h-12 pr-10 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {signUpForm.formState.errors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {signUpForm.formState.errors.password.message}
                    </motion.p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-r from-primary to-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating account...
                    </motion.div>
                  ) : (
                    'Sign Up'
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-primary font-semibold hover:underline focus:outline-none"
                  >
                    Sign in
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={signInForm.handleSubmit(handleSignIn)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="username"
                      autoFocus
                      {...signInForm.register('email')}
                      className="h-12 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-all duration-300"
                    />
                  {signInForm.formState.errors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {signInForm.formState.errors.email.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-xs text-primary hover:underline disabled:opacity-50 font-medium"
                    >
                      {resetLoading ? 'Sending...' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...signInForm.register('password')}
                      className="h-12 pr-10 bg-background/50 focus:bg-background border-border/50 focus:border-primary transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {signInForm.formState.errors.password.message}
                    </motion.p>
                  )}
                </div>

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
                    className="text-sm font-normal cursor-pointer text-muted-foreground"
                  >
                    Remember me for 30 days
                  </Label>
                </div>

                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{authError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-r from-primary to-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </motion.div>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary font-semibold hover:underline focus:outline-none"
                  >
                    Sign up
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
