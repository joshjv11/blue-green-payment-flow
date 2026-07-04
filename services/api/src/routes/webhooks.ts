import { Router, type Request, type Response } from 'express';
import { pool } from '../db.js';
import { verifyWebhookSignature } from '../lib/razorpay.js';

const router = Router();

async function razorpayWebhookHandler(req: Request, res: Response) {
  const bodyText = (req.body as Buffer).toString('utf8');
  const sig = (req.headers['x-razorpay-signature'] as string) || '';

  if (!verifyWebhookSignature(bodyText, sig)) {
    return res.status(400).json({ ok: false, error: 'Invalid signature' });
  }

  let event: {
    event: string;
    id?: string;
    payload?: {
      payment_link?: { entity?: { id?: string; amount?: number; reference_id?: string } };
      payment?: { entity?: { id?: string; amount?: number; payment_link_id?: string } };
    };
  };

  try {
    event = JSON.parse(bodyText);
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
  }

  try {
    const eventId = event.id ?? `${event.event}-${Date.now()}`;

    const existing = await pool.query(
      'SELECT id FROM webhookevents WHERE eventid = $1 LIMIT 1',
      [eventId]
    );
    if (existing.rows[0]) {
      return res.json({ ok: true, duplicate: true });
    }

    await pool.query(
      `INSERT INTO webhookevents (provider, eventid, payload) VALUES ('razorpay', $1, $2::jsonb)`,
      [eventId, bodyText]
    );

    if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      const amountPaise = paymentLinkEntity?.amount || paymentEntity?.amount || 0;
      const amount = amountPaise / 100;
      const razorpayLinkId = paymentLinkEntity?.id || paymentEntity?.payment_link_id || '';
      const providerPaymentId = paymentEntity?.id || razorpayLinkId;

      let paymentLinkRecord: { id: string; orgid: string; invoiceid: string } | null = null;
      if (razorpayLinkId) {
        const { rows } = await pool.query(
          `SELECT id, orgid, invoiceid FROM paymentlinks WHERE providerreferenceid = $1 LIMIT 1`,
          [razorpayLinkId]
        );
        paymentLinkRecord = rows[0] || null;
      }

      if (paymentLinkRecord) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          await client.query(
            `UPDATE paymentlinks SET status = 'paid', paidat = NOW() WHERE id = $1 AND orgid = $2`,
            [paymentLinkRecord.id, paymentLinkRecord.orgid]
          );

          const paymentInsert = await client.query<{ id: string }>(
            `INSERT INTO payments (orgid, invoiceid, amount, method, providerpaymentid, rawwebhook)
             VALUES ($1, $2, $3, 'razorpay', $4, $5::jsonb)
             ON CONFLICT (providerpaymentid) DO NOTHING
             RETURNING id`,
            [
              paymentLinkRecord.orgid,
              paymentLinkRecord.invoiceid,
              amount,
              providerPaymentId,
              bodyText,
            ]
          );

          if (paymentInsert.rows[0]) {
            await client.query(
              `UPDATE invoices
               SET amountpaid = LEAST(amount + taxamount, amountpaid + $3),
                   status = CASE
                     WHEN amountpaid + $3 >= amount + taxamount THEN 'paid'
                     WHEN amountpaid + $3 > 0 THEN 'partiallypaid'
                     ELSE status
                   END
               WHERE id = $1 AND orgid = $2`,
              [paymentLinkRecord.invoiceid, paymentLinkRecord.orgid, amount]
            );
          }

          await client.query(
            `UPDATE webhookevents SET processedat = NOW() WHERE eventid = $1`,
            [eventId]
          );

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('razorpay-webhook error', err);
    res.status(500).json({ error: String(err) });
  }
}

router.post('/razorpay', razorpayWebhookHandler);
router.post('/razorpay-webhook', razorpayWebhookHandler);

export default router;
