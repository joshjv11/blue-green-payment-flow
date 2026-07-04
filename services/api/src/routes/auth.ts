import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { PasswordSchema } from '../lib/password.js';
import {
  createSession,
  deliverSession,
  loadPrimaryMembership,
  rotateRefreshToken,
  revokeRefreshToken,
  REFRESH_COOKIE,
} from '../lib/authSession.js';
import {
  createVerificationToken,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from '../lib/verificationTokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js';
import {
  signinLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
  verifyEmailLimiter,
} from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const SignInBody = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(72),
  })
  .strict();

const SignUpBody = z
  .object({
    email: z.string().email(),
    password: PasswordSchema,
    full_name: z.string().optional(),
    org_name: z.string().min(1).optional(),
    fullname: z.string().optional(),
    orgname: z.string().min(1).optional(),
    company: z.string().optional(),
  })
  .strict()
  .transform((d) => ({
    email: d.email,
    password: d.password,
    full_name: d.full_name ?? d.fullname,
    org_name: d.org_name ?? d.orgname ?? d.company,
  }));

const ForgotPasswordBody = z.object({ email: z.string().email() }).strict();

const ResetPasswordBody = z
  .object({
    token: z.string().min(1),
    password: PasswordSchema,
  })
  .strict();

const VerifyEmailBody = z.object({ token: z.string().min(1) }).strict();

const GENERIC_RESET_RESPONSE = { ok: true, message: 'If that email exists, a reset link has been sent.' };

router.post('/signin', signinLimiter, async (req, res) => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { email, password } = parsed.data;

  try {
    const userResult = await pool.query(
      `SELECT id, email, fullname, passwordhash, emailverifiedat, tokenversion
       FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const user = userResult.rows[0];

    if (!user?.passwordhash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordhash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const membership = await loadPrimaryMembership(user.id);
    if (!membership) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { payload, rawRefresh } = await createSession(client, user, membership, req);
      await client.query('COMMIT');
      res.json(deliverSession(res, rawRefresh, payload));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('signin error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/signup', signupLimiter, async (req, res) => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { email, password, full_name, org_name } = parsed.data;
  const orgName = org_name ?? `${full_name ?? email}'s Organization`;

  const client = await pool.connect();
  let verifyRaw: string | null = null;
  let sessionPayload: ReturnType<typeof deliverSession> | null = null;
  let rawRefresh: string | null = null;

  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = randomUUID();
    const orgId = randomUUID();
    const passwordhash = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO users (id, email, fullname, passwordhash) VALUES ($1, $2, $3, $4)`,
      [userId, email, full_name ?? null, passwordhash]
    );

    await client.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [orgId, orgName]);

    await client.query(
      `INSERT INTO orgmembers (orgid, userid, role) VALUES ($1, $2, 'owner')`,
      [orgId, userId]
    );

    await client.query(
      `INSERT INTO subscriptions (orgid, plan, status) VALUES ($1, 'free', 'active')`,
      [orgId]
    );

    verifyRaw = await createVerificationToken(client, userId, 'email_verify');

    const user = {
      id: userId,
      email,
      fullname: full_name ?? null,
      emailverifiedat: null,
      tokenversion: 0,
    };
    const membership = { orgid: orgId, role: 'owner', plan: 'free' };
    const created = await createSession(client, user, membership, req);
    sessionPayload = created.payload;
    rawRefresh = created.rawRefresh;

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }

  if (verifyRaw) {
    const sent = await sendVerificationEmail(email, verifyRaw);
    if (!sent.ok) {
      console.error('signup verification email failed for', email);
    }
  }

  res.status(201).json(deliverSession(res, rawRefresh!, sessionPayload!));
});

router.post('/refresh', refreshLimiter, async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await rotateRefreshToken(rawToken, req, res);
    if (result === 'reuse_detected') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'concurrent_refresh') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('refresh error', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

router.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) {
    await revokeRefreshToken(rawToken, res);
  } else {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }
  res.json({ ok: true });
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { email } = parsed.data;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    const user = userResult.rows[0];

    if (user) {
      const client = await pool.connect();
      let resetRaw: string | null = null;
      try {
        await client.query('BEGIN');
        resetRaw = await createVerificationToken(client, user.id, 'password_reset');
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('forgot-password error', err);
      } finally {
        client.release();
      }

      if (resetRaw) {
        const sent = await sendPasswordResetEmail(email, resetRaw);
        if (!sent.ok) {
          console.error('password reset email failed for', email);
        }
      }
    }

    res.json(GENERIC_RESET_RESPONSE);
  } catch (err) {
    console.error('forgot-password error', err);
    res.json(GENERIC_RESET_RESPONSE);
  }
});

router.post('/reset-password', forgotPasswordLimiter, async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const { token, password } = parsed.data;

  try {
    const ok = await resetPasswordWithToken(token, password);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('reset-password error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-email', verifyEmailLimiter, async (req, res) => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  try {
    const ok = await verifyEmailWithToken(parsed.data.token);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('verify-email error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/resend-verification', verifyEmailLimiter, requireAuth, async (req, res) => {
  if (req.auth!.verified) {
    return res.json({ ok: true, message: 'Email already verified.' });
  }

  const client = await pool.connect();
  let verifyRaw: string | null = null;
  try {
    await client.query('BEGIN');
    verifyRaw = await createVerificationToken(client, req.auth!.userId, 'email_verify');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('resend-verification error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }

  const sent = await sendVerificationEmail(req.auth!.email, verifyRaw!);
  if (!sent.ok) {
    console.error('resend verification email failed for', req.auth!.email);
  }

  res.json({ ok: true, message: 'Verification email sent.' });
});

const UpdateMeBody = z
  .object({
    full_name: z.string().min(1).optional(),
    org_name: z.string().min(1).optional(),
  })
  .strict();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const membership = await loadPrimaryMembership(req.auth!.userId);
    const userResult = await pool.query(
      `SELECT id, email, fullname, emailverifiedat FROM users WHERE id = $1`,
      [req.auth!.userId]
    );
    const user = userResult.rows[0];
    if (!user || !membership) {
      return res.status(404).json({ error: 'User not found' });
    }

    const orgResult = await pool.query(
      `SELECT id, name, gstin, udyamnumber, upivpa, address, logourl FROM organizations WHERE id = $1`,
      [req.auth!.orgId]
    );
    const org = orgResult.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullname,
        org_id: membership.orgid,
        role: membership.role,
        plan: membership.plan,
        verified: user.emailverifiedat != null,
      },
      organization: org ?? null,
    });
  } catch (err) {
    console.error('get me error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (parsed.data.full_name !== undefined) {
      await client.query(`UPDATE users SET fullname = $1 WHERE id = $2`, [
        parsed.data.full_name,
        req.auth!.userId,
      ]);
    }

    if (parsed.data.org_name !== undefined) {
      await client.query(`UPDATE organizations SET name = $1 WHERE id = $2`, [
        parsed.data.org_name,
        req.auth!.orgId,
      ]);
    }

    await client.query('COMMIT');

    const membership = await loadPrimaryMembership(req.auth!.userId);
    const userResult = await pool.query(
      `SELECT id, email, fullname, emailverifiedat, tokenversion FROM users WHERE id = $1`,
      [req.auth!.userId]
    );
    const user = userResult.rows[0];
    if (!user || !membership) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullname,
        org_id: membership.orgid,
        role: membership.role,
        plan: membership.plan,
        verified: user.emailverifiedat != null,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('patch me error', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
