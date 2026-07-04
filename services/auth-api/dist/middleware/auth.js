import { pool } from '../db.js';
import { verifyAccessToken } from '../lib/tokens.js';
export async function requireAuth(req, res, next) {
    try {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = auth.slice('Bearer '.length);
        const payload = verifyAccessToken(token);
        const { rows } = await pool.query(`SELECT om.role,
              COALESCE(s.plan, 'free') AS plan,
              u.email,
              u.tokenversion,
              u.emailverifiedat
       FROM orgmembers om
       JOIN users u ON u.id = om.userid
       LEFT JOIN subscriptions s ON s.orgid = om.orgid
       WHERE om.userid = $1 AND om.orgid = $2
       LIMIT 1`, [payload.sub, payload.org]);
        const member = rows[0];
        if (!member) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (member.tokenversion !== payload.v) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.auth = {
            userId: payload.sub,
            orgId: payload.org,
            role: member.role,
            plan: member.plan,
            email: member.email,
            verified: member.emailverifiedat != null,
        };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
export function requireVerifiedEmail(req, res, next) {
    if (!req.auth)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!req.auth.verified) {
        return res.status(403).json({ error: 'Email verification required' });
    }
    next();
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!roles.includes(req.auth.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}
const PLAN_RANK = { free: 0, pro: 1, business: 2 };
export function requirePlan(minPlan) {
    return (req, res, next) => {
        if (!req.auth)
            return res.status(401).json({ error: 'Unauthorized' });
        const current = PLAN_RANK[req.auth.plan] ?? 0;
        const required = PLAN_RANK[minPlan] ?? 0;
        if (current < required) {
            return res.status(403).json({ error: `Requires ${minPlan} plan or higher` });
        }
        next();
    };
}
