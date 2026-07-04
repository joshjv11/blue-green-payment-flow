import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { env } from '../env.js';

export interface AccessTokenPayload {
  sub: string;
  org: string;
  role: string;
  plan: string;
  email: string;
  v: number;
}

const payloadSchema = z.object({
  sub: z.string().uuid(),
  org: z.string().uuid(),
  role: z.string().min(1),
  plan: z.string().min(1),
  email: z.string().email(),
  v: z.number().int().nonnegative(),
});

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  return payloadSchema.parse(decoded) as AccessTokenPayload;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}
