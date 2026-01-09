import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Copy, Check, Smartphone, ExternalLink, ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createRazorpayOrderLocal } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { PAYMENT_CONFIG } from '@/config/payment';

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const planType = searchParams.get('plan') as 'pro' | 'premium' | null;
  const amountMap = { pro: 99, premium: 999 } as const;
  const amount = planType ? amountMap[planType] : 0;
  const planName = planType === 'premium' ? 'Premium' : 'Pro';

  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dodoLoading, setDodoLoading] = useState(false);

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

  }, [planType, amount]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    if (!planType) return;

    setLoading(true);
    try {
      const res = await loadRazorpayScript();

      if (!res) {
        toast({
          title: 'Error',
          description: 'Razorpay SDK failed to load',
          variant: 'destructive'
        });
        return;
      }

      // Create Order
      const order = await createRazorpayOrderLocal({
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: `${planType}-${user?.id}-${Date.now()}`
      });

      if (!order) {
        throw new Error('No order returned');
      }

      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKeyId) {
        throw new Error('Razorpay key not configured. Please contact support.');
      }

      const options = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "InvoiceFlow",
        description: `${planName} Plan Subscription`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id,
                planId: planType
              })
            });

            if (verifyRes.ok) {
              toast({
                title: 'Payment Successful',
                description: `Payment verified! Plan upgraded to ${planName}.`,
              });
              navigate('/payment/success');
            } else {
              throw new Error("Verification failed on server");
            }
          } catch (err) {
            console.error(err);
            toast({
              title: 'Verification Failed',
              description: 'Payment successful but verification failed. Please contact support.',
              variant: 'destructive'
            });
          }
        },
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          contact: ''
        },
        theme: {
          color: "#3399cc"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (e: any) {
      console.error('Razorpay Error:', e);
      toast({
        title: 'Payment Error',
        description: 'Failed to initiate payment. Please try again.',
        variant: 'destructive'
      });
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

          {/* Dodo/Online Payment Section */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pay with Cards / NetBanking
              </CardTitle>
              <CardDescription>
                Secure checkout for Credit/Debit Cards, NetBanking, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleRazorpayPayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg transform transition hover:-translate-y-0.5"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Pay with Razorpay
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>✓ All Major Cards Accepted</p>
                <p>✓ Secure 128-bit Encryption</p>
                <p>✓ Instant Activation</p>
              </div>
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

