import { useState } from 'react';
import { toast } from 'sonner';

const DISABLED_MSG = 'WhatsApp integration is being upgraded and will be available soon.';

export const useWhatsAppIntegration = () => {
  const [isSending] = useState(false);
  const [isGeneratingLink] = useState(false);
  const [isBroadcasting] = useState(false);

  const disabled = () => {
    toast.error(DISABLED_MSG);
    return Promise.resolve({ success: false, error: DISABLED_MSG });
  };

  return {
    sendWhatsAppMessage: (_params: any) => disabled(),
    generatePaymentLink: (_params: any) => disabled(),
    sendInvoiceViaWhatsApp: (..._args: any[]) => disabled(),
    sendPaymentReminder: (..._args: any[]) => disabled(),
    sendPaymentLinkViaWhatsApp: (..._args: any[]) => disabled(),
    sendBroadcast: (..._args: any[]) => disabled(),
    isSending,
    isGeneratingLink,
    isBroadcasting,
  };
};
