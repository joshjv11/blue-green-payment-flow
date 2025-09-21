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
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
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