import { useState, useEffect } from 'react';
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
import { useWhatsAppIntegration } from '@/hooks/useWhatsAppIntegration';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createRazorpayPaymentLink } from '@/hooks/usePayments';

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
  isLoading?: boolean;
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
  invoiceNumber,
  isLoading = false
}: WhatsAppSendModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [message, setMessage] = useState(defaultMessage);
  
  const { sendWhatsAppMessage, isSending } = useWhatsAppIntegration();

  // Update message when defaultMessage changes (allow empty string to clear)
  useEffect(() => {
    setMessage(defaultMessage ?? '');
  }, [defaultMessage]);

  // Update phone when defaultPhone changes (allow empty string to clear)
  useEffect(() => {
    setPhoneNumber(defaultPhone ?? '');
  }, [defaultPhone]);

  const handleSend = async () => {
    if (!phoneNumber || !phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!message || !message.trim()) {
      toast.error('Please enter a message');
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
  };

  const handleGenerateUPILink = async () => {
    try {
      if (!amount || amount <= 0) {
        toast.error('Amount is required to generate a UPI payment link');
        return;
      }
      const { shortUrl } = await createRazorpayPaymentLink({
        amountInRupees: amount,
        description: invoiceNumber ? `Payment for Invoice ${invoiceNumber}` : 'Payment',
        referenceId: invoiceId,
        customer: undefined,
        notes: invoiceId ? { invoiceId } : undefined,
      });
      setMessage((m) => `${m ? m + '\n\n' : ''}Pay securely via UPI: ${shortUrl}`);
      toast.success('UPI payment link generated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create payment link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Send via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Send a private message directly to your customer's WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="+91 9876543210 or 9876543210"
              value={phoneNumber}
              onChange={(e) => {
                // Auto-format: remove spaces, add +91 if needed
                let value = e.target.value.replace(/\s+/g, '');
                // Remove leading zero if present
                if (value.startsWith('0') && !value.startsWith('+')) {
                  value = value.substring(1);
                }
                setPhoneNumber(value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +91 9876543210). Will auto-format if needed.
            </p>
            {phoneNumber && !phoneNumber.startsWith('+') && phoneNumber.length === 10 && (
              <p className="text-xs text-green-600 font-medium">Will format as: +91{phoneNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              {messageType === 'invoice' ? 'Invoice Details' : 'Message'}
              {isLoading && (
                <span className="ml-2 text-xs text-muted-foreground">(Loading invoice details...)</span>
              )}
            </Label>
            <Textarea
              id="message"
              placeholder={isLoading ? "Loading invoice details..." : "Type your message here..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={messageType === 'invoice' ? 12 : 6}
              className="resize-none font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {messageType === 'invoice' 
                ? 'Invoice details are automatically included. You can edit the message if needed.'
                : 'Supports text formatting with *bold* and _italic_'
              }
            </p>
            {messageType === 'invoice' && invoiceNumber && (
              <div className="text-xs bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-2 text-green-700 dark:text-green-300">
                ✓ Invoice {invoiceNumber} details loaded
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            variant="secondary"
            onClick={handleGenerateUPILink}
            disabled={isSending}
            className="gap-2"
          >
            Generate UPI Payment Link
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || !phoneNumber.trim() || !message.trim()}
            className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            {isSending ? 'Generating Link...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
