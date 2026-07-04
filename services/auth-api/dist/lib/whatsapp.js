import { env } from '../env.js';
export async function sendWhatsAppMessage(opts) {
    if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
        console.warn('WhatsApp not configured — message not sent to', opts.to);
        return { ok: false };
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: opts.to.replace(/\D/g, ''),
            type: 'template',
            template: {
                name: opts.templateName,
                language: { code: opts.languageCode ?? 'en' },
                components: opts.components,
            },
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        console.error('WhatsApp API error:', res.status, text);
        return { ok: false };
    }
    const data = (await res.json());
    return { ok: true, messageId: data.messages?.[0]?.id };
}
