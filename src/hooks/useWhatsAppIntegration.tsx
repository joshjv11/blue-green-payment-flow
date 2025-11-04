import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendWhatsAppMessageParams {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
  messageType: 'invoice' | 'reminder' | 'payment_link' | 'receipt' | 'broadcast' | 'custom';
  customerId?: string;
  invoiceId?: string;
  billId?: string;
  saleOrderId?: string;
}

interface GeneratePaymentLinkParams {
  amount: number;
  currency?: string;
  gateway: 'razorpay' | 'phonepe' | 'paytm' | 'upi';
  customerId?: string;
  invoiceId?: string;
  saleOrderId?: string;
  billId?: string;
  notes?: string;
}

export const useWhatsAppIntegration = () => {
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const sendWhatsAppMessage = async (params: SendWhatsAppMessageParams) => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: params
      });

      if (error) {
        console.error('WhatsApp send error:', error);
        const errorMessage = error.message || error.context?.message || 'Failed to send WhatsApp message. Please check Edge Functions logs.';
        toast.error(errorMessage);
        return { success: false, error };
      }

      // Handle case where edge function returns error status but data is null
      if (!data) {
        console.error('No data returned from edge function');
        toast.error('Edge function returned no data. Please check logs.');
        return { success: false, error: 'No data returned' };
      }

      if (!data.success) {
        const errorMessage = data.error || data.details || 'Failed to send message. Please check your WhatsApp number in Settings.';
        toast.error(errorMessage);
        return { success: false, error: data.error || data.details };
      }

      // If using FREE method (WhatsApp Web links), show the link
      if (data.whatsappUrl) {
        toast.success('WhatsApp link generated! Click to open WhatsApp.', {
          action: {
            label: 'Open WhatsApp',
            onClick: () => window.open(data.whatsappUrl, '_blank')
          },
          duration: 10000
        });
      } else {
        toast.success('WhatsApp message sent successfully! 📱');
      }
      
      return { success: true, data, whatsappUrl: data.whatsappUrl };
    } catch (error: any) {
      console.error('WhatsApp error:', error);
      toast.error('Failed to send WhatsApp message');
      return { success: false, error };
    } finally {
      setIsSending(false);
    }
  };

  const generatePaymentLink = async (params: GeneratePaymentLinkParams) => {
    setIsGeneratingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-payment-link', {
        body: params
      });

      if (error) {
        console.error('Payment link generation error:', error);
        toast.error('Failed to generate payment link');
        return { success: false, error };
      }

      if (!data.success) {
        toast.error(data.error || 'Failed to generate payment link');
        return { success: false, error: data.error };
      }

      toast.success('Payment link generated successfully! 💳');
      return { success: true, data: data.paymentLink };
    } catch (error: any) {
      console.error('Payment link error:', error);
      toast.error('Failed to generate payment link');
      return { success: false, error };
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const sendInvoiceViaWhatsApp = async (
    phoneNumber: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
    invoiceId?: string,
    customerId?: string
  ) => {
    const message = `🧾 *Invoice Notification*\n\nInvoice No: ${invoiceNumber}\nAmount: ₹${amount.toFixed(2)}\nDue Date: ${new Date(dueDate).toLocaleDateString('en-IN')}\n\nThank you for your business! 🙏`;

    return await sendWhatsAppMessage({
      phoneNumber,
      message,
      messageType: 'invoice',
      invoiceId,
      customerId
    });
  };

  const sendPaymentReminder = async (
    phoneNumber: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
    invoiceId?: string,
    customerId?: string
  ) => {
    const message = `⏰ *Payment Reminder*\n\nDear Customer,\n\nThis is a friendly reminder that Invoice ${invoiceNumber} for ₹${amount.toFixed(2)} is due on ${new Date(dueDate).toLocaleDateString('en-IN')}.\n\nPlease make the payment at your earliest convenience.\n\nThank you! 🙏`;

    return await sendWhatsAppMessage({
      phoneNumber,
      message,
      messageType: 'reminder',
      invoiceId,
      customerId
    });
  };

  const sendPaymentLinkViaWhatsApp = async (
    phoneNumber: string,
    amount: number,
    invoiceNumber: string,
    gateway: 'upi' | 'razorpay' | 'phonepe' | 'paytm' = 'upi',
    invoiceId?: string,
    customerId?: string
  ) => {
    // First generate payment link
    const linkResult = await generatePaymentLink({
      amount,
      gateway,
      invoiceId,
      customerId,
      notes: `Payment for Invoice ${invoiceNumber}`
    });

    if (!linkResult.success || !linkResult.data) {
      return { success: false, error: 'Failed to generate payment link' };
    }

    const paymentLink = linkResult.data;

    // Then send via WhatsApp
    const message = `💳 *Payment Link*\n\nInvoice: ${invoiceNumber}\nAmount: ₹${amount.toFixed(2)}\n\n${gateway === 'upi' ? '📱 Pay using UPI:' : '🔗 Payment Link:'}\n${paymentLink.url}\n\n${paymentLink.qrCodeUrl ? 'Scan QR code: ' + paymentLink.qrCodeUrl : ''}\n\nThank you! 🙏`;

    return await sendWhatsAppMessage({
      phoneNumber,
      message,
      messageType: 'payment_link',
      invoiceId,
      customerId
    });
  };

  const sendBroadcast = async (
    broadcastType: 'gst_reminder' | 'payment_reminder' | 'custom',
    message: string,
    customerIds?: string[],
    manualPhoneNumbers?: string[]
  ) => {
    setIsBroadcasting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-broadcast', {
        body: { 
          broadcastType, 
          message, 
          customerIds: customerIds || [],
          manualPhoneNumbers: manualPhoneNumbers || []
        }
      });

      if (error) {
        console.error('Broadcast error:', error);
        toast.error('Failed to send broadcast');
        return { success: false, error };
      }

      if (!data.success) {
        toast.error(data.error || 'Failed to send broadcast');
        return { success: false, error: data.error };
      }

      // Return the links so the UI can display them
      const links = data.whatsappLinks || [];
      console.log('📨 Broadcast response received:', {
        success: data.success,
        totalLinks: links.length,
        sent: data.sent,
        failed: data.failed,
        links: links.map((l: any, i: number) => `${i + 1}. ${l.name || l.phone}: ${l.url?.substring(0, 60)}...`)
      });
      
      return { 
        success: true, 
        data,
        whatsappLinks: links
      };
    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast.error('Failed to send broadcast');
      return { success: false, error };
    } finally {
      setIsBroadcasting(false);
    }
  };

  return {
    sendWhatsAppMessage,
    generatePaymentLink,
    sendInvoiceViaWhatsApp,
    sendPaymentReminder,
    sendPaymentLinkViaWhatsApp,
    sendBroadcast,
    isSending,
    isGeneratingLink,
    isBroadcasting
  };
};
