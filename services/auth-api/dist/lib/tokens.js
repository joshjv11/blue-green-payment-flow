import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { env } from '../env.js';
const payloadSchema = z.object({
    sub: z.string().uuid(),
    org: z.string().uuid(),
    role: z.string().min(1),
    plan: z.string().min(1),
    email: z.string().email(),
    v: z.number().int().nonnegative(),
});
export function signAccessToken(payload) {
    const options = {
        expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
        algorithm: 'HS256',
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return payloadSchema.parse(decoded);
}
export function hashToken(raw) {
    return createHash('sha256').update(raw).digest('hex');
}
export function generateRefreshToken() {
    return randomBytes(32).toString('hex');
}
