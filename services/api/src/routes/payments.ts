import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import { createPaymentLink } from '../lib/razorpay.js';
import { findInvoiceInOrg } from '../lib/orgQuery.js';

const router = Router();

const PaymentLinkBody = z
  .object({
    invoiceid: z.string().uuid(),
    amount: z.number().positive(),
    gateway: z.enum(['upi', 'razorpay']),
    currency: z.string().default('INR'),
    notes: z.string().optional(),
  })
  .strict();

async function createPaymentLinkHandler(req: Request, res: Response) {
  const parsed = PaymentLinkBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { invoiceid, amount, gateway, currency, notes } = parsed.data;
  const orgId = req.auth!.orgId;

  try {
    const invoice = await findInvoiceInOrg(pool, invoiceid, orgId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    let paymentLinkUrl = '';
    let qrCodeUrl = '';
    let upiId = '';
    let providerReferenceId = '';

    if (gateway === 'upi') {
      const orgResult = await pool.query(
        'SELECT upivpa FROM organizations WHERE id = $1 LIMIT 1',
        [orgId]
      );
      upiId = orgResult.rows[0]?.upivpa || env.UPI_ID || '';
      if (!upiId) {
        return res.status(400).json({ error: 'UPI VPA not configured for organization' });
      }
      const upiString = `upi://pay?pa=${upiId}&pn=InvoiceFlow&am=${amount}&cu=${currency}&tn=${encodeURIComponent(notes || 'Payment')}`;
      paymentLinkUrl = upiString;
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
    } else {
      const referenceId = `${orgId}-${invoiceid}-${Date.now()}`;
      const rp = await createPaymentLink({
        amount,
        currency,
        description: notes || `Invoice ${invoice.invoicenumber}`,
        referenceId,
      });
      paymentLinkUrl = rp.url;
      providerReferenceId = rp.id;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { rows } = await pool.query(
      `INSERT INTO paymentlinks (orgid, invoiceid, gateway, url, providerreferenceid, amount, status, expiresat)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7)
       RETURNING *`,
      [orgId, invoiceid, gateway, paymentLinkUrl, providerReferenceId || null, amount, expiresAt.toISOString()]
    );

    res.json({
      success: true,
      paymentLink: {
        id: rows[0].id,
        url: paymentLinkUrl,
        qrCodeUrl: qrCodeUrl || null,
        upiId: upiId || null,
        amount,
        currency,
        gateway,
        expiresAt: expiresAt.toISOString(),
        providerReferenceId,
      },
    });
  } catch (err) {
    console.error('generate-payment-link error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}

router.post('/links', requireAuth, createPaymentLinkHandler);
router.post('/generate-payment-link', requireAuth, createPaymentLinkHandler);

export default router;
