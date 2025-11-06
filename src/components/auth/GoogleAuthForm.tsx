import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';
import { useAnalytics } from '@/hooks/useAnalytics';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  company: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface GoogleAuthFormProps {
  onSuccess?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const GoogleAuthForm = ({ onSuccess }: GoogleAuthFormProps) => {
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oneTapDismissed, setOneTapDismissed] = useState(false);
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      company: '',
      agreeToTerms: false,
    },
  });

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setGoogleLoading(true);
    try {
      track('auth_google_onetap_attempt');

      // Exchange Google ID token with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (error) throw error;

      if (data.session) {
        track('auth_google_onetap_success');
        toast({
          title: "You're in—welcome back!",
          description: "Signed in with Google",
        });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Google One Tap error:', error);
      track('auth_error', { kind: 'google_onetap_failed', error: error.message });
      toast({
        title: "Google login failed",
        description: error.message || "Please try again or use email/password",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  }, [toast, track, onSuccess]);

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && !oneTapDismissed) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: (response: any) => {
            if (response.credential) {
              handleGoogleCredential(response.credential);
            }
          },
          auto_select: true,
          cancel_on_tap_outside: false,
        });

        // Show One Tap prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('One Tap not displayed or skipped');
            setOneTapDismissed(true);
          }
          if (notification.isDismissedMoment()) {
            console.log('One Tap dismissed by user');
            setOneTapDismissed(true);
          }
        });
      }
    };

    track('auth_viewed', { version: 'google_onetap' });

    return () => {
      document.body.removeChild(script);
    };
  }, [handleGoogleCredential, oneTapDismissed, track]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      track('auth_google_button_attempt');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      track('auth_google_button_initiated');
      // OAuth will redirect, no need to call onSuccess here
    } catch (error: any) {
      track('auth_error', { kind: 'google_button_failed', error: error.message });
      toast({
        title: "Google login canceled",
        description: "Please try again or use email/password below",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async (data: SignInFormData) => {
    try {
      track('auth_email_signin_attempt');
      await signIn(data.email, data.password);
      track('auth_email_signin_success');
      onSuccess?.();
    } catch (error: any) {
      track('auth_error', { kind: 'email_signin_failed', error: error.message });
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      track('auth_email_signup_attempt');
      await signUp(data.email, data.password, data.fullName, data.company);
      track('auth_email_signup_success');
      onSuccess?.();
    } catch (error: any) {
      track('auth_error', { kind: 'email_signup_failed', error: error.message });
    }
  };

  const handleForgotPassword = async () => {
    const email = signInForm.getValues('email');
    if (!email) {
      signInForm.setError('email', { message: 'Please enter your email address' });
      return;
    }

    setResetPasswordLoading(true);
    try {
      track('auth_password_reset_attempt');
      await resetPassword(email);
      track('auth_password_reset_success');
    } catch (error: any) {
      track('auth_error', { kind: 'password_reset_failed', error: error.message });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-background/95">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={invoiceFlowLogo} 
                alt="InvoiceFlow" 
                className="h-16 w-auto"
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Sign in to InvoiceFlow
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Faster payments start here.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 border-2 hover:bg-accent/50 transition-all duration-300 font-medium"
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="signin" className="data-[state=active]:bg-background">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-background">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@company.com"
                      className="h-11"
                      {...signInForm.register('email')}
                    />
                    {signInForm.formState.errors.email && (
                      <div className="flex items-center space-x-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{signInForm.formState.errors.email.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-11 pr-10"
                        {...signInForm.register('password')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {signInForm.formState.errors.password && (
                      <div className="flex items-center space-x-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{signInForm.formState.errors.password.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        {...signInForm.register('rememberMe')}
                      />
                      <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                        Remember Me
                      </Label>
                    </div>
                    
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:text-primary/80 p-0 h-auto"
                      onClick={handleForgotPassword}
                      disabled={resetPasswordLoading}
                    >
                      {resetPasswordLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Forgot Password?'
                      )}
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullname" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="John Doe"
                        className="h-11"
                        {...signUpForm.register('fullName')}
                      />
                      {signUpForm.formState.errors.fullName && (
                        <div className="flex items-center space-x-1 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{signUpForm.formState.errors.fullName.message}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-company" className="text-sm font-medium">
                        Company
                      </Label>
                      <Input
                        id="signup-company"
                        type="text"
                        placeholder="Optional"
                        className="h-11"
                        {...signUpForm.register('company')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      className="h-11"
                      {...signUpForm.register('email')}
                    />
                    {signUpForm.formState.errors.email && (
                      <div className="flex items-center space-x-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{signUpForm.formState.errors.email.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        className="h-11 pr-10"
                        {...signUpForm.register('password')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {signUpForm.formState.errors.password && (
                      <div className="flex items-center space-x-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{signUpForm.formState.errors.password.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        className="h-11 pr-10"
                        {...signUpForm.register('confirmPassword')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {signUpForm.formState.errors.confirmPassword && (
                      <div className="flex items-center space-x-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{signUpForm.formState.errors.confirmPassword.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agree-terms"
                      {...signUpForm.register('agreeToTerms')}
                      className="mt-0.5"
                    />
                    <Label htmlFor="agree-terms" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-primary hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </Label>
                  </div>
                  {signUpForm.formState.errors.agreeToTerms && (
                    <div className="flex items-center space-x-1 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{signUpForm.formState.errors.agreeToTerms.message}</span>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleAuthForm;
