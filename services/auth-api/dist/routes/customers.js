import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const optionalEmail = z.union([z.string().email(), z.literal(''), z.null()]).optional();
const CustomerBody = z
    .object({
    name: z.string().min(1),
    email: optionalEmail,
    phone: z.string().nullable().optional(),
    whatsappphone: z.string().nullable().optional(),
    gstin: z.string().nullable().optional(),
    billingaddress: z.record(z.unknown()).nullable().optional(),
    notes: z.string().nullable().optional(),
    preferredchannel: z.enum(['email', 'whatsapp', 'both']).optional(),
})
    .strict();
router.get('/', requireAuth, async (req, res) => {
    const orgId = req.auth.orgId;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    try {
        let query = `
      SELECT c.*,
             COALESCE(SUM(i.amount + i.taxamount - i.amountpaid), 0) AS outstanding
      FROM customers c
      LEFT JOIN invoices i ON i.customerid = c.id AND i.orgid = c.orgid
        AND i.status NOT IN ('paid', 'writtenoff')
      WHERE c.orgid = $1`;
        const params = [orgId];
        if (search) {
            query += ` AND (c.name ILIKE $2 OR c.email ILIKE $2 OR c.phone ILIKE $2)`;
            params.push(`%${search}%`);
        }
        query += ` GROUP BY c.id ORDER BY c.name ASC`;
        const { rows } = await pool.query(query, params);
        res.json({ customers: rows });
    }
    catch (err) {
        console.error('customers list error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1 AND orgid = $2 LIMIT 1', [req.params.id, req.auth.orgId]);
        if (!rows[0])
            return res.status(404).json({ error: 'Customer not found' });
        res.json({ customer: rows[0] });
    }
    catch (err) {
        console.error('customers get error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.post('/', requireAuth, async (req, res) => {
    const parsed = CustomerBody.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const d = parsed.data;
    const id = randomUUID();
    try {
        const { rows } = await pool.query(`INSERT INTO customers (id, orgid, name, email, phone, whatsappphone, gstin, billingaddress, notes, preferredchannel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`, [
            id, req.auth.orgId, d.name, d.email || null, d.phone ?? null,
            d.whatsappphone ?? null, d.gstin ?? null, d.billingaddress ?? null,
            d.notes ?? null, d.preferredchannel ?? 'both',
        ]);
        res.status(201).json({ customer: rows[0] });
    }
    catch (err) {
        console.error('customers create error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.patch('/:id', requireAuth, async (req, res) => {
    const parsed = CustomerBody.partial().strict().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const fields = parsed.data;
    const sets = [];
    const values = [req.params.id, req.auth.orgId];
    let idx = 3;
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
            sets.push(`${key} = $${idx++}`);
            values.push(key === 'billingaddress' && value ? JSON.stringify(value) : value);
        }
    }
    if (sets.length === 0)
        return res.status(400).json({ error: 'No fields to update' });
    try {
        const { rows } = await pool.query(`UPDATE customers SET ${sets.join(', ')} WHERE id = $1 AND orgid = $2 RETURNING *`, values);
        if (!rows[0])
            return res.status(404).json({ error: 'Customer not found' });
        res.json({ customer: rows[0] });
    }
    catch (err) {
        console.error('customers patch error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1 AND orgid = $2', [req.params.id, req.auth.orgId]);
        if (!rowCount)
            return res.status(404).json({ error: 'Customer not found' });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('customers delete error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
export default router;
