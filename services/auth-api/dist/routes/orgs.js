import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = Router();
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT o.id, o.name, o.gstin, o.udyamnumber, o.upivpa, o.address, o.logourl,
              om.role, COALESCE(s.plan, 'free') AS plan
       FROM organizations o
       JOIN orgmembers om ON om.orgid = o.id AND om.userid = $1
       LEFT JOIN subscriptions s ON s.orgid = o.id
       WHERE o.id = $2
       LIMIT 1`, [req.auth.userId, req.auth.orgId]);
        const org = rows[0];
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
        res.json({ organization: org });
    }
    catch (err) {
        console.error('orgs/me error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
const UpdateOrgBody = z
    .object({
    name: z.string().min(1).optional(),
    gstin: z.string().nullable().optional(),
    udyamnumber: z.string().nullable().optional(),
    upivpa: z.string().nullable().optional(),
    address: z.record(z.unknown()).nullable().optional(),
    logourl: z.string().nullable().optional(),
})
    .strict();
router.patch('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
    const orgId = req.params.id;
    if (orgId !== req.auth.orgId) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const parsed = UpdateOrgBody.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const fields = parsed.data;
    const sets = [];
    const values = [req.auth.orgId];
    let idx = 2;
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
            sets.push(`${key} = $${idx++}`);
            values.push(value);
        }
    }
    if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }
    try {
        const { rows } = await pool.query(`UPDATE organizations SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, values);
        if (!rows[0])
            return res.status(404).json({ error: 'Organization not found' });
        res.json({ organization: rows[0] });
    }
    catch (err) {
        console.error('orgs patch error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
export default router;
