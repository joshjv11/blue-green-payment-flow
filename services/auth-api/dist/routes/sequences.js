import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
const router = Router();
const SequenceBody = z
    .object({
    name: z.string().min(1),
    isdefault: z.boolean().optional(),
    steps: z.array(z.record(z.unknown())).optional(),
})
    .strict();
router.get('/', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM dunningsequences WHERE orgid = $1 ORDER BY name ASC', [req.auth.orgId]);
        res.json({ sequences: rows });
    }
    catch (err) {
        console.error('sequences list error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM dunningsequences WHERE id = $1 AND orgid = $2 LIMIT 1', [req.params.id, req.auth.orgId]);
        if (!rows[0])
            return res.status(404).json({ error: 'Sequence not found' });
        res.json({ sequence: rows[0] });
    }
    catch (err) {
        console.error('sequences get error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.post('/', requireAuth, requireVerifiedEmail, async (req, res) => {
    const parsed = SequenceBody.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const d = parsed.data;
    const id = randomUUID();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (d.isdefault) {
            await client.query('UPDATE dunningsequences SET isdefault = false WHERE orgid = $1', [req.auth.orgId]);
        }
        const { rows } = await client.query(`INSERT INTO dunningsequences (id, orgid, name, isdefault, steps)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`, [id, req.auth.orgId, d.name, d.isdefault ?? false, JSON.stringify(d.steps ?? [])]);
        await client.query('COMMIT');
        res.status(201).json({ sequence: rows[0] });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('sequences create error', err);
        res.status(500).json({ error: 'Server error' });
    }
    finally {
        client.release();
    }
});
router.patch('/:id', requireAuth, requireVerifiedEmail, async (req, res) => {
    const parsed = SequenceBody.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (parsed.data.isdefault) {
            await client.query('UPDATE dunningsequences SET isdefault = false WHERE orgid = $1', [req.auth.orgId]);
        }
        const fields = parsed.data;
        const sets = [];
        const values = [req.params.id, req.auth.orgId];
        let idx = 3;
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                sets.push(`${key} = $${idx++}`);
                values.push(key === 'steps' ? JSON.stringify(value) : value);
            }
        }
        if (sets.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No fields to update' });
        }
        const { rows } = await client.query(`UPDATE dunningsequences SET ${sets.join(', ')} WHERE id = $1 AND orgid = $2 RETURNING *`, values);
        await client.query('COMMIT');
        if (!rows[0])
            return res.status(404).json({ error: 'Sequence not found' });
        res.json({ sequence: rows[0] });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('sequences patch error', err);
        res.status(500).json({ error: 'Server error' });
    }
    finally {
        client.release();
    }
});
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM dunningsequences WHERE id = $1 AND orgid = $2', [req.params.id, req.auth.orgId]);
        if (!rowCount)
            return res.status(404).json({ error: 'Sequence not found' });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('sequences delete error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
export default router;
