import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Phone, Fingerprint, Shield, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';
import { useAnalytics } from '@/hooks/useAnalytics';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const phoneSchema = z.object({
  phone: z.string().min(10, 'Please enter a valid phone number'),
});

const otpSchema = z.object({
  otp: z.string().min(6, 'Please enter the 6-digit code'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

interface AuthV2FormProps {
  onSuccess?: () => void;
}

const AuthV2Form = ({ onSuccess }: AuthV2FormProps) => {
  const [activeTab, setActiveTab] = useState('passkey');
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpChannel, setOtpChannel] = useState<'email' | 'sms'>('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { signInWithMagicLink, loading } = useAuth();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
    // Check if WebAuthn is available
    const checkPasskeySupport = async () => {
      if (window.PublicKeyCredential && 
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
        setIsPasskeyAvailable(true);
        // Auto-prompt passkey if user has one
        if (localStorage.getItem('invoiceflow_has_passkey') === 'true') {
          handlePasskeySignIn();
        }
      } else {
        // Fallback to magic link if no passkey support
        setActiveTab('magiclink');
      }
    };

    checkPasskeySupport();
    track('auth_viewed', { version: 'v2' });

    // Handle online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [track]);

  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true);
    try {
      track('auth_passkey_prompted', { auto: true });
      
      // Get authentication challenge from your backend
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [],
          userVerification: 'preferred',
          timeout: 60000,
        }
      });

      if (credential) {
        // Verify credential with your backend
        // For now, simulate success
        track('auth_passkey_success', { method: 'existing' });
        toast({
          title: "You're in—welcome back!",
          description: "Signed in with your passkey",
        });
        onSuccess?.();
      }
    } catch (error: any) {
      console.log('Passkey sign-in cancelled or failed:', error);
      track('auth_error', { kind: 'passkey_failed', error: error.name });
      // Don't show error toast for user cancellation
      if (error.name !== 'NotAllowedError') {
        toast({
          title: "Passkey sign-in failed",
          description: "Please try another method below",
          variant: "destructive",
        });
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleMagicLink = async (data: EmailFormData) => {
    setMagicLinkLoading(true);
    try {
      // Store email in localStorage for callback verification
      localStorage.setItem('login_email', data.email);
      
      const redirectTo = new URLSearchParams(window.location.search).get('next') || '/dashboard';
      
      await signInWithMagicLink(data.email);
      track('auth_magiclink_sent', { email: data.email });
      
      toast({
        title: "Magic link sent!",
        description: "Check your email—click the link to finish sign-in.",
      });
    } catch (error: any) {
      track('auth_error', { kind: 'magiclink_failed', error: error.message });
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleSendOTP = async (channel: 'email' | 'sms') => {
    setOtpLoading(true);
    setOtpChannel(channel);
    
    try {
      const contact = channel === 'email' 
        ? emailForm.getValues('email')
        : phoneForm.getValues('phone');

      if (!contact) {
        if (channel === 'email') {
          emailForm.setError('email', { message: 'Please enter your email' });
        } else {
          phoneForm.setError('phone', { message: 'Please enter your phone' });
        }
        return;
      }

      // Send OTP via Supabase
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: contact,
          options: {
            shouldCreateUser: true,
          }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: contact,
          options: {
            shouldCreateUser: true,
          }
        });
        if (error) throw error;
      }

      setOtpSent(true);
      setResendCooldown(60);
      track('auth_otp_sent', { channel });
      
      toast({
        title: `Code sent via ${channel}!`,
        description: `Enter the 6-digit code we sent to ${contact}`,
      });

      // Start cooldown timer
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      track('auth_error', { kind: 'otp_send_failed', channel, error: error.message });
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (data: OTPFormData) => {
    try {
      const contact = otpChannel === 'email' 
        ? emailForm.getValues('email')
        : phoneForm.getValues('phone');

      const verifyData = otpChannel === 'email'
        ? { email: contact, token: data.otp, type: 'email' as const }
        : { phone: contact, token: data.otp, type: 'sms' as const };

      const { error } = await supabase.auth.verifyOtp(verifyData);
      
      if (error) throw error;

      track('auth_otp_verified', { channel: otpChannel });
      toast({
        title: "You're in—welcome back!",
        description: "Successfully verified your code",
      });
      onSuccess?.();
    } catch (error: any) {
      track('auth_error', { kind: 'otp_verify_failed', channel: otpChannel, error: error.message });
      toast({
        title: "Invalid code",
        description: "Please check the code and try again",
        variant: "destructive",
      });
    }
  };

  const handleResendOTP = () => {
    if (resendCooldown === 0) {
      handleSendOTP(otpChannel);
    }
  };

  const switchOTPChannel = () => {
    const newChannel = otpChannel === 'email' ? 'sms' : 'email';
    setOtpChannel(newChannel);
    setOtpSent(false);
    setResendCooldown(0);
    otpForm.reset();
  };

  if (isOffline) {
    return (
      <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-strong border-0 backdrop-blur-sm bg-background/95">
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">You're offline</h2>
              <p className="text-muted-foreground mb-4">
                Please check your internet connection and try again.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                Sign in to InvoiceFlow
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Faster payments start here.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Privacy Notice */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                No passwords. No Google. Just secure, passwordless sign-in.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger 
                  value="passkey" 
                  className="data-[state=active]:bg-background"
                  disabled={!isPasskeyAvailable}
                >
                  <Fingerprint className="h-4 w-4 mr-1" />
                  Passkey
                </TabsTrigger>
                <TabsTrigger value="magiclink" className="data-[state=active]:bg-background">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="otp" className="data-[state=active]:bg-background">
                  <Phone className="h-4 w-4 mr-1" />
                  Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="passkey" className="space-y-4 mt-6">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Continue with Passkey</h3>
                    <p className="text-sm text-muted-foreground">
                      Use your device's built-in security to sign in instantly
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handlePasskeySignIn}
                    className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-all duration-300"
                    disabled={passkeyLoading || loading}
                  >
                    {passkeyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="mr-2 h-4 w-4" />
                        Continue with Passkey
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="magiclink" className="space-y-4 mt-6">
                <form onSubmit={emailForm.handleSubmit(handleMagicLink)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Work email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                      {...emailForm.register('email')}
                    />
                    {emailForm.formState.errors.email && (
                      <div className="flex items-center space-x-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{emailForm.formState.errors.email.message}</span>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-all duration-300"
                    disabled={magicLinkLoading || loading}
                  >
                    {magicLinkLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Email me a magic link
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="otp" className="space-y-4 mt-6">
                {!otpSent ? (
                  <div className="space-y-4">
                    <Tabs value={otpChannel} onValueChange={(value) => setOtpChannel(value as 'email' | 'sms')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="email">Email</TabsTrigger>
                        <TabsTrigger value="sms">SMS</TabsTrigger>
                      </TabsList>

                      <TabsContent value="email" className="space-y-4 mt-4">
                        <form onSubmit={emailForm.handleSubmit(() => handleSendOTP('email'))} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="otp-email" className="text-sm font-medium">
                              Work email
                            </Label>
                            <Input
                              id="otp-email"
                              type="email"
                              placeholder="Enter your email"
                              className="h-11"
                              {...emailForm.register('email')}
                            />
                            {emailForm.formState.errors.email && (
                              <div className="flex items-center space-x-1 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{emailForm.formState.errors.email.message}</span>
                              </div>
                            )}
                          </div>
                          <Button type="submit" className="w-full h-11" disabled={otpLoading}>
                            {otpLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Email me a code'
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="sms" className="space-y-4 mt-4">
                        <form onSubmit={phoneForm.handleSubmit(() => handleSendOTP('sms'))} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm font-medium">
                              Mobile number
                            </Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="+1 (555) 123-4567"
                              className="h-11"
                              {...phoneForm.register('phone')}
                            />
                            {phoneForm.formState.errors.phone && (
                              <div className="flex items-center space-x-1 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{phoneForm.formState.errors.phone.message}</span>
                              </div>
                            )}
                          </div>
                          <Button type="submit" className="w-full h-11" disabled={otpLoading}>
                            {otpLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Text me a code'
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Enter verification code</h3>
                      <p className="text-sm text-muted-foreground">
                        We sent a 6-digit code to your {otpChannel}
                      </p>
                    </div>

                    <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={otpForm.watch('otp')}
                            onChange={(value) => {
                              otpForm.setValue('otp', value);
                              if (value.length === 6) {
                                otpForm.handleSubmit(handleVerifyOTP)();
                              }
                            }}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        {otpForm.formState.errors.otp && (
                          <div className="flex items-center justify-center space-x-1 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{otpForm.formState.errors.otp.message}</span>
                          </div>
                        )}
                      </div>
                    </form>

                    <div className="text-center space-y-2">
                      <Button
                        variant="ghost"
                        onClick={handleResendOTP}
                        disabled={resendCooldown > 0}
                        className="text-sm"
                      >
                        {resendCooldown > 0 ? (
                          `You can resend in ${resendCooldown}s`
                        ) : (
                          'Resend'
                        )}
                      </Button>
                      
                      <Button
                        variant="link"
                        onClick={switchOTPChannel}
                        className="text-sm text-muted-foreground"
                      >
                        Didn't get it? Try {otpChannel === 'email' ? 'SMS' : 'email'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthV2Form;