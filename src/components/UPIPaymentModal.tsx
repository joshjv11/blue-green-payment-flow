import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Smartphone, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UPIPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: 'monthly' | 'yearly';
}

const UPIPaymentModal = ({ open, onOpenChange, plan }: UPIPaymentModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Replace with your actual UPI ID
  const merchantUpiId = 'your-upi-id@paytm';
  
  const amount = plan === 'monthly' ? 99 : 999;
  const planType = plan === 'monthly' ? 'pro_monthly' : 'pro_yearly';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !transactionId.trim() || !userPhone.trim()) return;

    setIsSubmitting(true);
    try {
      // Store payment details locally for now - in production this would go to Supabase
      const paymentData = {
        user_id: user.id,
        user_email: user.email,
        user_phone: userPhone,
        upi_id: upiId,
        transaction_id: transactionId,
        amount: amount,
        plan_type: planType,
        status: 'pending',
        payment_method: 'UPI',
        currency: 'INR',
        created_at: new Date().toISOString()
      };

      // Store in localStorage temporarily
      const existingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
      existingPayments.push(paymentData);
      localStorage.setItem('pending_payments', JSON.stringify(existingPayments));

      toast({
        title: "Payment Submitted!",
        description: "Your payment is being verified. You'll be upgraded within 24 hours.",
      });

      onOpenChange(false);
      setTransactionId('');
      setUpiId('');
      setUserPhone('');
    } catch (error: any) {
      console.error('Payment submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit payment details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            UPI Payment - ₹{amount}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Details */}
          <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Pro Plan</h3>
              <Badge variant="secondary">
                {plan === 'monthly' ? 'Monthly' : 'Yearly'}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-primary">₹{amount}</div>
            {plan === 'yearly' && (
              <div className="text-sm text-muted-foreground">
                Save ₹189 (2 months free!)
              </div>
            )}
          </Card>

          {/* UPI Payment Instructions */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Step 1: Pay via UPI</Label>
              <Card className="p-4 mt-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Pay to UPI ID:</div>
                    <div className="font-mono text-lg">{merchantUpiId}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Amount: ₹{amount}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(merchantUpiId)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </Card>
            </div>

            <Separator />

            {/* Transaction Details Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Step 2: Enter Payment Details</Label>
              </div>

              <div>
                <Label htmlFor="phone">Your Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="upiId">Your UPI ID (optional)</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="transactionId">UPI Transaction ID *</Label>
                <Input
                  id="transactionId"
                  placeholder="Enter 12-digit transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in your UPI app after payment completion
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || !transactionId.trim() || !userPhone.trim()}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Payment Details'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
              <div className="flex items-start gap-2">
                <QrCode className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Verification:</strong> Your payment will be manually verified within 24 hours. 
                  You'll receive a confirmation and your account will be upgraded to Pro automatically.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UPIPaymentModal;