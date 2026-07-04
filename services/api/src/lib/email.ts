import { env } from '../env.js';

export async function sendVerificationEmail(to: string, rawToken: string): Promise<{ ok: boolean }> {
  const link = `${env.APP_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  return sendEmail({
    to,
    subject: 'Verify your InvoiceFlow email',
    html: `<p>Welcome to InvoiceFlow!</p><p><a href="${link}">Click here to verify your email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<{ ok: boolean }> {
  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  return sendEmail({
    to,
    subject: 'Reset your InvoiceFlow password',
    html: `<p><a href="${link}">Click here to reset your password</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; id?: string }> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent:', opts.subject, '→', opts.to);
    return { ok: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', res.status, text);
    return { ok: false };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}
