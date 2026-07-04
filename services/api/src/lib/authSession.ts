import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { env } from '../env.js';
import { signAccessToken, hashToken, generateRefreshToken } from './tokens.js';

export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_REUSE_GRACE_MS = 30_000;

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  org_id: string;
  role: string;
  plan: string;
  verified: boolean;
}

export interface SessionPayload {
  token: string;
  user: SessionUser;
}

interface DbUser {
  id: string;
  email: string;
  fullname: string | null;
  emailverifiedat: Date | null;
  tokenversion: number;
}

interface DbMembership {
  orgid: string;
  role: string;
  plan: string;
}

function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}

export function setRefreshCookie(res: Response, rawToken: string): void {
  res.cookie(REFRESH_COOKIE, rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/auth',
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/auth',
  });
}

function buildSessionUser(user: DbUser, membership: DbMembership): SessionUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullname,
    org_id: membership.orgid,
    role: membership.role,
    plan: membership.plan,
    verified: user.emailverifiedat != null,
  };
}

export async function loadPrimaryMembership(
  userId: string,
  client?: PoolClient
): Promise<DbMembership | null> {
  const q = client ?? pool;
  const { rows } = await q.query<DbMembership>(
    `SELECT om.orgid, om.role, COALESCE(s.plan, 'free') AS plan
     FROM orgmembers om
     LEFT JOIN subscriptions s ON s.orgid = om.orgid
     WHERE om.userid = $1
     ORDER BY om.createdat ASC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

/** Persist refresh token row only — cookie is set after commit via deliverSession. */
export async function createSession(
  client: PoolClient,
  user: DbUser,
  membership: DbMembership,
  req: Request
): Promise<{ payload: SessionPayload; rawRefresh: string }> {
  const rawRefresh = generateRefreshToken();
  const familyId = randomUUID();

  await client.query(
    `INSERT INTO refreshtokens (userid, tokenhash, familyid, expiresat, useragent, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.id,
      hashToken(rawRefresh),
      familyId,
      refreshExpiresAt(),
      req.headers['user-agent'] ?? null,
      req.ip ?? null,
    ]
  );

  const token = signAccessToken({
    sub: user.id,
    org: membership.orgid,
    role: membership.role,
    plan: membership.plan,
    email: user.email,
    v: user.tokenversion,
  });

  return {
    rawRefresh,
    payload: { token, user: buildSessionUser(user, membership) },
  };
}

export function deliverSession(
  res: Response,
  rawRefresh: string,
  payload: SessionPayload
): SessionPayload {
  setRefreshCookie(res, rawRefresh);
  return payload;
}

export async function rotateRefreshToken(
  rawToken: string,
  req: Request,
  res: Response
): Promise<SessionPayload | 'reuse_detected'> {
  const tokenHash = hashToken(rawToken);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{
      id: string;
      userid: string;
      familyid: string;
      revokedat: Date | null;
      expiresat: Date;
    }>(
      `SELECT id, userid, familyid, revokedat, expiresat
       FROM refreshtokens
       WHERE tokenhash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    const row = rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      throw new Error('invalid_refresh');
    }

    if (row.revokedat) {
      const revokedMs = Date.now() - row.revokedat.getTime();
      if (revokedMs < REFRESH_REUSE_GRACE_MS) {
        // Concurrent tab refresh race — do not revoke the family; client retries with updated cookie.
        await client.query('ROLLBACK');
        throw new Error('concurrent_refresh');
      }

      await client.query(
        `UPDATE refreshtokens SET revokedat = now()
         WHERE familyid = $1 AND revokedat IS NULL`,
        [row.familyid]
      );
      await client.query(
        `UPDATE users SET tokenversion = tokenversion + 1 WHERE id = $1`,
        [row.userid]
      );
      await client.query('COMMIT');
      clearRefreshCookie(res);
      return 'reuse_detected';
    }

    if (row.expiresat.getTime() < Date.now()) {
      await client.query(`UPDATE refreshtokens SET revokedat = now() WHERE id = $1`, [row.id]);
      await client.query('COMMIT');
      throw new Error('expired_refresh');
    }

    await client.query(`UPDATE refreshtokens SET revokedat = now() WHERE id = $1`, [row.id]);

    const userResult = await client.query<DbUser>(
      `SELECT id, email, fullname, emailverifiedat, tokenversion FROM users WHERE id = $1`,
      [row.userid]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      throw new Error('invalid_refresh');
    }

    const membership = await loadPrimaryMembership(user.id, client);
    if (!membership) {
      await client.query('ROLLBACK');
      throw new Error('no_membership');
    }

    const newRaw = generateRefreshToken();
    await client.query(
      `INSERT INTO refreshtokens (userid, tokenhash, familyid, expiresat, useragent, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        hashToken(newRaw),
        row.familyid,
        refreshExpiresAt(),
        req.headers['user-agent'] ?? null,
        req.ip ?? null,
      ]
    );

    await client.query('COMMIT');
    setRefreshCookie(res, newRaw);

    const token = signAccessToken({
      sub: user.id,
      org: membership.orgid,
      role: membership.role,
      plan: membership.plan,
      email: user.email,
      v: user.tokenversion,
    });

    return { token, user: buildSessionUser(user, membership) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function revokeRefreshToken(rawToken: string, res: Response): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await pool.query(
    `UPDATE refreshtokens SET revokedat = now() WHERE tokenhash = $1 AND revokedat IS NULL`,
    [tokenHash]
  );
  clearRefreshCookie(res);
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await pool.query(
    `UPDATE refreshtokens SET revokedat = now() WHERE userid = $1 AND revokedat IS NULL`,
    [userId]
  );
}
