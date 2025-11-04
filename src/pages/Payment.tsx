import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Copy, Check, Smartphone, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createRazorpayPaymentLink } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { PAYMENT_CONFIG } from '@/config/payment';

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const planType = searchParams.get('plan') as 'pro' | 'premium' | null;
  const amountMap = { pro: 100, premium: 999 } as const;
  const amount = planType ? amountMap[planType] : 0;
  const planName = planType === 'premium' ? 'Premium' : 'Pro';
  
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // UPI ID from config
  const UPI_ID = PAYMENT_CONFIG.UPI_ID;
  const upiString = `upi://pay?pa=${UPI_ID}&pn=${PAYMENT_CONFIG.UPI_NAME}&am=${amount}&cu=INR&tn=${encodeURIComponent(`${planName} Plan Subscription`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(upiString)}`;
  
  useEffect(() => {
    if (!planType || !amount) {
      toast({
        title: 'Invalid Payment',
        description: 'Please select a plan first.',
        variant: 'destructive'
      });
      navigate('/upgrade');
      return;
    }
    
    // Generate Razorpay payment link
    generatePaymentLink();
  }, [planType, amount]);
  
  const generatePaymentLink = async () => {
    if (!planType) return;
    
    setLoading(true);
    try {
      const { shortUrl } = await createRazorpayPaymentLink({
        amountInRupees: amount,
        description: `${planName} plan subscription`,
        referenceId: `${planType}-${user?.id}-${Date.now()}`,
        customer: user?.email ? {
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0]
        } : undefined,
        notes: { plan: planType, userId: user?.id || '' }
      });
      setPaymentLink(shortUrl);
    } catch (e: any) {
      console.error('Payment link error:', e);
      // Don't show error toast - UPI QR code is always available
      // Just log it and continue with UPI option
      setPaymentLink(null);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Payment details copied to clipboard'
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const openUPI = () => {
    window.location.href = upiString;
  };

  // Note: Payment notifications will be sent via webhook when payment is completed
  // The admin will be notified automatically when payment is verified
  
  if (!planType || !amount) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/upgrade')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Complete Your Payment
          </h1>
          <p className="text-muted-foreground">
            {planName} Plan - ₹{amount}/month
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* UPI QR Code Section */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan & Pay via UPI
              </CardTitle>
              <CardDescription>
                Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-64 h-64"
                />
              </div>
              
              {/* UPI ID */}
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <div className="flex gap-2">
                  <Input 
                    value={UPI_ID} 
                    readOnly 
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(UPI_ID)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Open UPI Button */}
              <Button
                onClick={openUPI}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                size="lg"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Open in UPI App
              </Button>
            </CardContent>
          </Card>
          
          {/* Razorpay Payment Link Section */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Pay via Payment Link
              </CardTitle>
              <CardDescription>
                Secure payment gateway with multiple payment options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Generating payment link...</p>
                </div>
              ) : paymentLink ? (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Payment Link:</p>
                    <div className="flex gap-2">
                      <Input 
                        value={paymentLink} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(paymentLink)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => window.open(paymentLink, '_blank')}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Payment Link
                  </Button>
                  
                  <div className="text-xs text-muted-foreground text-center space-y-1">
                    <p>✓ Supports UPI, Cards, Net Banking</p>
                    <p>✓ Secure & Instant</p>
                    <p>✓ Automatic Plan Activation</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Failed to generate payment link</p>
                  <Button
                    variant="outline"
                    onClick={generatePaymentLink}
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Payment Instructions */}
        <Card className="mt-6 border-muted">
          <CardHeader>
            <CardTitle className="text-lg">Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Choose your preferred payment method above</li>
              <li>Complete the payment using UPI QR code or payment link</li>
              <li>Your plan will be activated automatically after payment confirmation</li>
              <li>You'll receive a confirmation email once the payment is processed</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;

