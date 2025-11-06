import { supabase } from '@/lib/supabase';

type CreatePaymentLinkArgs = {
  amountInRupees: number; // e.g. 499.99
  customer?: { name?: string; email?: string; contact?: string };
  description?: string;
  referenceId?: string;
  notes?: Record<string, string>;
};

export async function createRazorpayPaymentLink(args: CreatePaymentLinkArgs) {
  const amountPaise = Math.round((args.amountInRupees || 0) * 100);
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: {
      amount: amountPaise,
      description: args.description,
      reference_id: args.referenceId,
      customer: args.customer,
      notes: args.notes,
    },
  });

  if (error) throw error;
  if (!data?.success || !data?.shortUrl) {
    throw new Error(data?.error?.description || 'Failed to create payment link');
  }
  return { linkId: data.linkId as string, shortUrl: data.shortUrl as string };
}


