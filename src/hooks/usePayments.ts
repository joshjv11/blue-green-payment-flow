import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export async function createRazorpayPaymentLink(_args: any): Promise<never> {
  throw new Error('Payment system is temporarily offline.');
}

export async function createDodoPaymentLink(_args: any): Promise<never> {
  throw new Error('Payment system is temporarily offline.');
}

export async function createRazorpayOrderLocal(_args: any): Promise<never> {
  throw new Error('Payment system is temporarily offline.');
}

export const usePayments = () => {
  const [loading] = useState(false);
  const { toast } = useToast();

  const generatePaymentLink = async (_plan: 'pro' | 'premium', _userId: string) => {
    toast({
      title: 'Upgrades Temporarily Disabled',
      description: 'We are upgrading our payment system. Please check back shortly.',
      variant: 'destructive',
    });
    return { success: false, error: 'Payment system is currently offline.' };
  };

  return { generatePaymentLink, loading };
};
