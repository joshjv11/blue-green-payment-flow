import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { hashToken } from './tokens.js';

export type VerificationTokenType = 'email_verify' | 'password_reset';

const TTL_HOURS: Record<VerificationTokenType, number> = {
  email_verify: 24,
  password_reset: 1,
};

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createVerificationToken(
  client: PoolClient,
  userId: string,
  type: VerificationTokenType
): Promise<string> {
  await client.query(
    `UPDATE verificationtokens SET usedat = now()
     WHERE userid = $1 AND type = $2 AND usedat IS NULL`,
    [userId, type]
  );

  const raw = generateVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TTL_HOURS[type]);

  await client.query(
    `INSERT INTO verificationtokens (userid, tokenhash, type, expiresat)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashToken(raw), type, expiresAt]
  );

  return raw;
}

export async function consumeVerificationToken(
  client: PoolClient,
  rawToken: string,
  type: VerificationTokenType
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const { rows } = await client.query<{ id: string; userid: string }>(
    `SELECT id, userid FROM verificationtokens
     WHERE tokenhash = $1 AND type = $2 AND usedat IS NULL AND expiresat > now()
     FOR UPDATE`,
    [tokenHash, type]
  );

  const row = rows[0];
  if (!row) return null;

  await client.query(`UPDATE verificationtokens SET usedat = now() WHERE id = $1`, [row.id]);
  return row.userid;
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<boolean> {
  const passwordhash = await bcrypt.hash(newPassword, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const userId = await consumeVerificationToken(client, rawToken, 'password_reset');
    if (!userId) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `UPDATE users SET passwordhash = $1, tokenversion = tokenversion + 1 WHERE id = $2`,
      [passwordhash, userId]
    );
    await client.query(
      `UPDATE refreshtokens SET revokedat = now() WHERE userid = $1 AND revokedat IS NULL`,
      [userId]
    );
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function verifyEmailWithToken(rawToken: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await consumeVerificationToken(client, rawToken, 'email_verify');
    if (!userId) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      `UPDATE users SET emailverifiedat = now() WHERE id = $1 AND emailverifiedat IS NULL`,
      [userId]
    );
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
