import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';

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

interface EnhancedAuthFormProps {
  onSuccess?: () => void;
}

const EnhancedAuthForm = ({ onSuccess }: EnhancedAuthFormProps) => {
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const { toast } = useToast();

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

  const handleSignIn = async (data: SignInFormData) => {
    try {
      await signIn(data.email, data.password);
      onSuccess?.();
    } catch (error: any) {
      // Error handling is already done in the useAuth hook with toast
      console.error('Sign in error:', error);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      await signUp(data.email, data.password, data.fullName, data.company);
      onSuccess?.();
    } catch (error: any) {
      // Error handling is already done in the useAuth hook with toast
      console.error('Sign up error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔐 Initiating Google OAuth flow...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        toast({
          title: "Sign-in failed",
          description: error.message || "Failed to sign in with Google. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Google OAuth initiated successfully');
      // OAuth will redirect, no need to call onSuccess here
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      toast({
        title: "Sign-in failed", 
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
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
      await resetPassword(email);
    } catch (error: any) {
      // Error handling is already done in the useAuth hook with toast
      console.error('Reset password error:', error);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-strong border-0 backdrop-blur-sm bg-background/95">
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
                Welcome to InvoiceFlow
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {activeTab === 'signin' 
                  ? 'Sign in to manage your invoices and payments'
                  : 'Create your account and start managing invoices'
                }
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* FOMO Banner */}
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                🚀 Early access users get exclusive premium features — secure your spot!
              </p>
            </div>

            {/* Google Sign In */}
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-11 border-2 hover:bg-muted/50 transition-all duration-300"
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
              Sign in with Google
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
                      placeholder="Enter your email"
                      className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
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
                        className="h-11 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                        {...signInForm.register('password')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                      <Label htmlFor="remember-me" className="text-sm text-muted-foreground">
                        Remember me
                      </Label>
                    </div>
                    
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:text-primary-hover p-0 h-auto"
                      onClick={handleForgotPassword}
                      disabled={resetPasswordLoading}
                    >
                      {resetPasswordLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Forgot password?'
                      )}
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-all duration-300"
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
                        className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
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
                        className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
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
                      placeholder="Enter your email"
                      className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
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
                        placeholder="Create a strong password"
                        className="h-11 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                        {...signUpForm.register('password')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                    <Label htmlFor="signup-confirm" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="h-11 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                        {...signUpForm.register('confirmPassword')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                      className="mt-1"
                    />
                    <Label htmlFor="agree-terms" className="text-sm text-muted-foreground leading-5">
                      I agree to the{' '}
                      <a href="#terms" className="text-primary hover:text-primary-hover underline">
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href="#privacy" className="text-primary hover:text-primary-hover underline">
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
                    className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-all duration-300"
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

            <div className="text-center text-sm text-muted-foreground">
              {activeTab === 'signin' ? (
                <span>
                  Don't have an account?{' '}
                  <Button
                    variant="link"
                    className="text-primary hover:text-primary-hover p-0 h-auto font-medium"
                    onClick={() => setActiveTab('signup')}
                  >
                    Sign up
                  </Button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <Button
                    variant="link"
                    className="text-primary hover:text-primary-hover p-0 h-auto font-medium"
                    onClick={() => setActiveTab('signin')}
                  >
                    Sign in
                  </Button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedAuthForm;