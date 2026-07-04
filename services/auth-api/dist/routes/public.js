import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { calculateMsmedInterest } from '../lib/interest.js';
const router = Router();
router.get('/invoice/:token', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT i.*, o.name AS orgname, o.logourl, o.gstin, c.name AS customername
       FROM invoices i
       JOIN organizations o ON o.id = i.orgid
       JOIN customers c ON c.id = i.customerid AND c.orgid = i.orgid
       WHERE i.publictoken = $1
       LIMIT 1`, [req.params.token]);
        const invoice = rows[0];
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        const interest = calculateMsmedInterest(parseFloat(invoice.amount) + parseFloat(invoice.taxamount) - parseFloat(invoice.amountpaid), new Date(invoice.duedate), invoice.ismsmesupplier);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentView = await pool.query(`SELECT id FROM activitylog
       WHERE orgid = $1 AND invoiceid = $2 AND type = 'viewed_by_customer' AND createdat > $3
       LIMIT 1`, [invoice.orgid, invoice.id, oneHourAgo.toISOString()]);
        if (!recentView.rows[0]) {
            await pool.query(`INSERT INTO activitylog (orgid, invoiceid, actor, type, payload)
         VALUES ($1, $2, 'customer', 'viewed_by_customer', $3)`, [invoice.orgid, invoice.id, JSON.stringify({ token: req.params.token })]);
        }
        res.json({
            invoice: {
                ...invoice,
                msmed_interest: interest,
            },
        });
    }
    catch (err) {
        console.error('public invoice error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
const PromiseBody = z.object({
    promiseddate: z.string(),
    promisedamount: z.number().positive(),
    note: z.string().optional(),
});
router.post('/invoice/:token/promise', async (req, res) => {
    const parsed = PromiseBody.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    try {
        const { rows } = await pool.query('SELECT id, orgid FROM invoices WHERE publictoken = $1 LIMIT 1', [req.params.token]);
        const invoice = rows[0];
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        const id = randomUUID();
        const { rows: promiseRows } = await pool.query(`INSERT INTO promisestopay (id, invoiceid, orgid, promiseddate, promisedamount, note)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`, [id, invoice.id, invoice.orgid, parsed.data.promiseddate, parsed.data.promisedamount, parsed.data.note ?? null]);
        await pool.query(`INSERT INTO activitylog (orgid, invoiceid, actor, type, payload)
       VALUES ($1, $2, 'customer', 'promise_to_pay', $3)`, [invoice.orgid, invoice.id, JSON.stringify({ promise_id: id })]);
        res.status(201).json({ promise: promiseRows[0] });
    }
    catch (err) {
        console.error('public promise error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
export default router;
