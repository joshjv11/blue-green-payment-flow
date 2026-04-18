const API_BASE = (() => {
  try { return (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8787'; } catch { return 'http://localhost:8787'; }
})();

type CreatePaymentLinkArgs = {
  amountInRupees: number;
  customer?: { name?: string; email?: string; contact?: string };
  description?: string;
  referenceId?: string;
  notes?: Record<string, string>;
};

export async function createRazorpayPaymentLink(args: CreatePaymentLinkArgs) {
  const token = localStorage.getItem('invoiceflow_jwt');

  const res = await fetch(`${API_BASE}/api/generate-payment-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      amount: args.amountInRupees,
      gateway: 'razorpay',
      notes: args.description,
      referenceId: args.referenceId,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to create payment link');
  }
  return {
    linkId: data.paymentLink.providerReferenceId as string,
    shortUrl: data.paymentLink.url as string,
  };
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


