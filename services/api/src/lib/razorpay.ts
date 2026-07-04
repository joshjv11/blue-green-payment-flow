import { createHmac } from 'crypto';
import { env } from '../env.js';

function basicAuth(): string {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
}

export async function createPaymentLink(payload: {
  amount: number;
  currency: string;
  description: string;
  referenceId: string;
}): Promise<{ id: string; url: string }> {
  const rpPayload = {
    amount: Math.round(payload.amount * 100),
    currency: payload.currency || 'INR',
    description: payload.description,
    reference_id: payload.referenceId,
    notify: { sms: true, email: true },
    reminder_enable: true,
    accept_partial: false,
  };

  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rpPayload),
  });

  const data = (await res.json()) as { id?: string; short_url?: string; url?: string; error?: unknown };
  if (!res.ok) {
    throw new Error(`Razorpay error: ${JSON.stringify(data.error ?? data)}`);
  }

  return {
    id: data.id ?? '',
    url: data.short_url || data.url || '',
  };
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
  return expected === signature;
}
