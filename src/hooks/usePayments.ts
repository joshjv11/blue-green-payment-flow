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

export async function createDodoPaymentLink(args: CreatePaymentLinkArgs) {
  const amountPaise = Math.round((args.amountInRupees || 0) * 100);

  const response = await fetch('/api/dodo/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      productName: args.description || 'Premium Plan',
      customerEmail: args.customer?.email,
      customerName: args.customer?.name
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create Dodo payment link');
  }

  const data = await response.json();
  return { checkoutUrl: data.checkout_url, sessionId: data.session_id };
}

export async function createRazorpayOrderLocal(args: { amount: number; currency?: string; receipt?: string }) {
  const response = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: args.amount, // Expecting paise
      currency: args.currency || 'INR',
      receipt: args.receipt
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create Razorpay order');
  }

  const data = await response.json();
  return data.order;
}


