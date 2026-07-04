import { createHmac } from 'crypto';
import { env } from '../env.js';
function basicAuth() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay keys not configured');
    }
    return Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
}
export async function createPaymentLink(payload) {
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
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(`Razorpay error: ${JSON.stringify(data.error ?? data)}`);
    }
    return {
        id: data.id ?? '',
        url: data.short_url || data.url || '',
    };
}
export function verifyWebhookSignature(body, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET)
        return false;
    const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
    return expected === signature;
}
