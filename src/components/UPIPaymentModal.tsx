import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Smartphone, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

import { PAYMENT_CONFIG, getUPIPaymentString } from '@/config/payment';

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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  const currentPlan = PAYMENT_CONFIG.PLANS[plan];
  const merchantUpiId = PAYMENT_CONFIG.UPI_ID;
  
  console.log('🏦 Payment Modal - Plan Details:', { 
    plan, 
    amount: currentPlan.amount, 
    upiId: merchantUpiId, 
    user: user?.email 
  });

  // Check for existing pending payments on modal open
  useEffect(() => {
    const checkPendingPayments = async () => {
      if (!user || !open) return;
      
      try {
        const { data: pendingPayments } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        setHasPendingPayment((pendingPayments && pendingPayments.length > 0) || false);
        
        // If there are pending payments, show submitted state
        if (pendingPayments && pendingPayments.length > 0) {
          setIsSubmitted(true);
        }
      } catch (error) {
        console.error('❌ Error checking pending payments:', error);
      }
    };

    checkPendingPayments();
  }, [user, open]);

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
    
    console.log('🏦 Submitting payment details:', { 
      userPhone, 
      transactionId, 
      plan: currentPlan.name,
      amount: currentPlan.amount,
      user: user?.email 
    });
    
    if (!user || !transactionId.trim() || !userPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate transaction ID
    if (transactionId.trim().length < 8) {
      toast({
        title: "Invalid Transaction ID",
        description: "Please enter a valid UPI transaction ID (minimum 8 characters)",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check for duplicate transaction ID first
      const { data: existingTransaction } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (existingTransaction) {
        toast({
          title: "Duplicate Transaction",
          description: "This transaction ID has already been submitted. Please check your UPI app for a different transaction.",
          variant: "destructive"
        });
        return;
      }

      // Submit to Supabase payment_transactions table
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_phone: userPhone,
          upi_id: upiId || null,
          transaction_id: transactionId,
          amount: currentPlan.amount,
          currency: currentPlan.currency,
          payment_method: 'UPI',
          plan_type: currentPlan.id,
          status: 'pending',
          payment_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Payment submission error:', error);
        
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Duplicate Transaction",
            description: "This transaction ID has already been submitted.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      console.log('✅ Payment submitted successfully:', data);
      
      setIsSubmitted(true);
      setHasPendingPayment(true);

      toast({
        title: "✅ Payment Submitted Successfully!",
        description: "Your payment is now under review. You'll be upgraded to Pro within 24 hours once verified.",
        duration: 6000,
      });

      // Reset form fields
      setTransactionId('');
      setUpiId('');
      setUserPhone('');
      
    } catch (error: any) {
      console.error('❌ Payment submission error:', error);
      
      let errorMessage = 'Failed to submit payment details. Please try again.';
      if (error.message?.includes('duplicate') || error.code === '23505') {
        errorMessage = 'This transaction ID has already been submitted. Please use a different transaction.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Invalid transaction details. Please check and try again.';
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
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
            UPI Payment - ₹{currentPlan.amount}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status - Show if submitted or has pending payment */}
          {(isSubmitted || hasPendingPayment) && (
            <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-400">
                    ⏳ Payment Under Review
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Your payment has been submitted and is being verified by our team. 
                    You'll be upgraded to Pro automatically once approved (usually within 24 hours).
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    💡 No need to submit another payment - we'll notify you once it's verified!
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Plan Details */}
          <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{currentPlan.name}</h3>
              <Badge variant="secondary">
                {plan === 'monthly' ? 'Monthly' : 'Yearly'}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-primary">₹{currentPlan.amount}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {currentPlan.description}
            </div>
            {plan === 'yearly' && (
              <div className="text-sm text-green-600 font-medium mt-1">
                Save ₹{PAYMENT_CONFIG.PLANS.yearly.discount} (2 months free!)
              </div>
            )}
          </Card>

          {/* UPI Payment Instructions */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Step 1: Pay via UPI</Label>
                <Card className="p-4 mt-2 bg-green-50 dark:bg-green-900/20 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Pay to UPI ID:</div>
                      <div className="font-mono text-lg text-green-700 dark:text-green-400">
                        {merchantUpiId}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Amount: ₹{currentPlan.amount} • Official {PAYMENT_CONFIG.UPI_NAME} Payment ID ✓
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(merchantUpiId)}
                        className="border-green-200 hover:bg-green-50"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const upiLink = getUPIPaymentString(currentPlan.amount, `${PAYMENT_CONFIG.UPI_NAME} ${currentPlan.name}`);
                          if (navigator.share) {
                            navigator.share({ url: upiLink });
                          } else {
                            window.open(upiLink, '_blank');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Pay
                      </Button>
                    </div>
                  </div>
                </Card>
            </div>

            <Separator />

            {/* Transaction Details Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Disable form if payment already submitted */}
              <fieldset disabled={isSubmitted || hasPendingPayment}>
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
                  disabled={isSubmitting || !transactionId.trim() || !userPhone.trim() || isSubmitted || hasPendingPayment}
                >
                  {isSubmitting ? 'Submitting...' : 
                   (isSubmitted || hasPendingPayment) ? 'Payment Already Submitted' : 
                   'Submit Payment Details'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  {isSubmitted || hasPendingPayment ? 'Close' : 'Cancel'}
                </Button>
              </div>
              </fieldset>
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