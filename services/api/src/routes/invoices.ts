import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { findCustomerInOrg } from '../lib/orgQuery.js';

const router = Router();

const InvoiceBody = z
  .object({
    customerid: z.string().uuid(),
    invoicenumber: z.string().min(1),
    issuedate: z.string(),
    duedate: z.string(),
    amount: z.number().min(0),
    taxamount: z.number().min(0).optional(),
    currency: z.string().optional(),
    lineitems: z.array(z.unknown()).optional(),
    ismsmesupplier: z.boolean().optional(),
    msmeagreementexists: z.boolean().optional(),
  })
  .strict();

const InvoicePatchBody = InvoiceBody.partial()
  .extend({
    status: z.enum(['draft', 'sent', 'partiallypaid', 'paid', 'writtenoff']).optional(),
  })
  .strict();

router.get('/', requireAuth, async (req, res) => {
  const orgId = req.auth!.orgId;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const customerId = typeof req.query.customer_id === 'string' ? req.query.customer_id : undefined;
  const aging = typeof req.query.aging === 'string' ? req.query.aging : undefined;

  try {
    let query = `SELECT i.*, c.name AS customername
                 FROM invoices i
                 JOIN customers c ON c.id = i.customerid AND c.orgid = i.orgid
                 WHERE i.orgid = $1`;
    const params: unknown[] = [orgId];
    let idx = 2;

    if (status) {
      query += ` AND i.status = $${idx++}`;
      params.push(status);
    }
    if (customerId) {
      query += ` AND i.customerid = $${idx++}`;
      params.push(customerId);
    }
    if (aging) {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
      };
      query += ` AND i.status NOT IN ('paid', 'writtenoff')`;
      if (aging === '0-30') {
        query += ` AND i.duedate >= $${idx++}`;
        params.push(daysAgo(30));
      } else if (aging === '31-60') {
        query += ` AND i.duedate >= $${idx++} AND i.duedate < $${idx++}`;
        params.push(daysAgo(60), daysAgo(30));
      } else if (aging === '61-90') {
        query += ` AND i.duedate >= $${idx++} AND i.duedate < $${idx++}`;
        params.push(daysAgo(90), daysAgo(60));
      } else if (aging === '90+') {
        query += ` AND i.duedate < $${idx++}`;
        params.push(daysAgo(90));
      }
    }

    query += ' ORDER BY i.duedate ASC';

    const { rows } = await pool.query(query, params);
    res.json({ invoices: rows });
  } catch (err) {
    console.error('invoices list error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, c.name AS customername
       FROM invoices i
       JOIN customers c ON c.id = i.customerid AND c.orgid = i.orgid
       WHERE i.id = $1 AND i.orgid = $2
       LIMIT 1`,
      [req.params.id, req.auth!.orgId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice: rows[0] });
  } catch (err) {
    console.error('invoices get error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = InvoiceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const d = parsed.data;
  if (new Date(d.duedate) < new Date(d.issuedate)) {
    return res.status(400).json({ error: 'due_date must be on or after issue_date' });
  }

  const id = randomUUID();
  const orgId = req.auth!.orgId;

  try {
    const customer = await findCustomerInOrg(pool, d.customerid, orgId);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found in organization' });
    }

    const { rows } = await pool.query(
      `INSERT INTO invoices (id, orgid, customerid, invoicenumber, issuedate, duedate, amount, taxamount, currency, lineitems, ismsmesupplier, msmeagreementexists, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
       RETURNING *`,
      [
        id, orgId, d.customerid, d.invoicenumber, d.issuedate, d.duedate,
        d.amount, d.taxamount ?? 0, d.currency ?? 'INR',
        d.lineitems ? JSON.stringify(d.lineitems) : null,
        d.ismsmesupplier ?? false, d.msmeagreementexists ?? false,
      ]
    );
    res.status(201).json({ invoice: rows[0] });
  } catch (err) {
    console.error('invoices create error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const parsed = InvoicePatchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const fields = parsed.data;
  const orgId = req.auth!.orgId;

  if (fields.customerid) {
    const customer = await findCustomerInOrg(pool, fields.customerid, orgId);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found in organization' });
    }
  }

  if (fields.duedate && fields.issuedate && new Date(fields.duedate) < new Date(fields.issuedate)) {
    return res.status(400).json({ error: 'due_date must be on or after issue_date' });
  }

  const sets: string[] = [];
  const values: unknown[] = [req.params.id, orgId];
  let idx = 3;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(key === 'lineitems' && value ? JSON.stringify(value) : value);
    }
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  try {
    const { rows } = await pool.query(
      `UPDATE invoices SET ${sets.join(', ')} WHERE id = $1 AND orgid = $2 RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice: rows[0] });
  } catch (err) {
    console.error('invoices patch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM invoices WHERE id = $1 AND orgid = $2 AND status = 'draft'`,
      [req.params.id, req.auth!.orgId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Invoice not found or not deletable' });
    res.json({ ok: true });
  } catch (err) {
    console.error('invoices delete error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
