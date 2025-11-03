import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppIntegration } from '@/hooks/useWhatsAppIntegration';
import { MessageCircle, CreditCard, Link as LinkIcon } from 'lucide-react';

interface WhatsAppSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string;
  defaultMessage?: string;
  messageType?: 'invoice' | 'reminder' | 'payment_link' | 'receipt' | 'custom';
  invoiceId?: string;
  customerId?: string;
  amount?: number;
  invoiceNumber?: string;
}

export const WhatsAppSendModal = ({
  open,
  onOpenChange,
  defaultPhone = '',
  defaultMessage = '',
  messageType = 'custom',
  invoiceId,
  customerId,
  amount,
  invoiceNumber
}: WhatsAppSendModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [message, setMessage] = useState(defaultMessage);
  const [sendType, setSendType] = useState<'message' | 'payment_link'>('message');
  const [paymentGateway, setPaymentGateway] = useState<'upi' | 'razorpay' | 'phonepe'>('upi');
  
  const { sendWhatsAppMessage, sendPaymentLinkViaWhatsApp, isSending } = useWhatsAppIntegration();

  const handleSend = async () => {
    if (!phoneNumber || !phoneNumber.trim()) {
      return;
    }

    if (sendType === 'payment_link' && amount) {
      const result = await sendPaymentLinkViaWhatsApp(
        phoneNumber,
        amount,
        invoiceNumber || 'INV',
        paymentGateway,
        invoiceId,
        customerId
      );

      if (result.success) {
        onOpenChange(false);
        setPhoneNumber('');
        setMessage('');
      }
    } else {
      if (!message || !message.trim()) {
        return;
      }

      const result = await sendWhatsAppMessage({
        phoneNumber,
        message,
        messageType,
        invoiceId,
        customerId
      });

      if (result.success) {
        onOpenChange(false);
        setPhoneNumber('');
        setMessage('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Send via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Send invoice notifications, payment reminders, or payment links directly to your customer's WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sendType">Send Type</Label>
            <Select value={sendType} onValueChange={(value: 'message' | 'payment_link') => setSendType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Message Only
                  </div>
                </SelectItem>
                <SelectItem value="payment_link">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Payment Link
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Customer Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="+91 9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
          </div>

          {sendType === 'payment_link' ? (
            <>
              {amount && (
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="text-2xl font-bold text-primary">₹{amount.toFixed(2)}</div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="gateway">Payment Gateway</Label>
                <Select value={paymentGateway} onValueChange={(value: any) => setPaymentGateway(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        UPI (Direct)
                      </div>
                    </SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="phonepe">PhonePe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                WhatsApp open rate: 90%+ vs Email: 15-20%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || !phoneNumber.trim() || (sendType === 'message' && !message.trim())}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {isSending ? 'Sending...' : sendType === 'payment_link' ? 'Generate & Send' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
