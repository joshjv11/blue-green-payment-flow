import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { REFRESH_COOKIE } from '../src/lib/authSession.js';

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();

vi.mock('../src/db.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
    connect: () => mockConnect(),
  },
  checkDbConnection: vi.fn().mockResolvedValue(true),
}));

vi.mock('../src/lib/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

const { createApp } = await import('../src/app.js');

const userId = '11111111-1111-1111-1111-111111111111';
const orgId = '22222222-2222-2222-2222-222222222222';
const refreshRaw = 'a'.repeat(64);

function mockDbClient() {
  mockConnect.mockResolvedValue({
    query: mockClientQuery,
    release: mockClientRelease,
  });
}

describe('auth refresh flow', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
  });

  it('POST /auth/refresh returns new access token when cookie is valid', async () => {
    mockDbClient();

    mockClientQuery.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM refreshtokens') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'rt-1',
            userid: userId,
            familyid: 'fam-1',
            revokedat: null,
            expiresat: new Date(Date.now() + 86400000),
          }],
        };
      }
      if (sql.includes('UPDATE refreshtokens SET revokedat')) return { rows: [] };
      if (sql.includes('FROM users WHERE id')) {
        return {
          rows: [{
            id: userId,
            email: 'user@test.com',
            fullname: 'Test User',
            emailverifiedat: new Date(),
            tokenversion: 0,
          }],
        };
      }
      if (sql.includes('orgmembers')) {
        return { rows: [{ orgid: orgId, role: 'owner', plan: 'free' }] };
      }
      if (sql.includes('INSERT INTO refreshtokens')) return { rows: [] };
      return { rows: [] };
    });

    mockQuery.mockResolvedValue({ rows: [] });

    const app = createApp();
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE}=${refreshRaw}`);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('user@test.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /auth/refresh rejects missing cookie', async () => {
    const app = createApp();
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('POST /auth/logout clears session', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = createApp();
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', `${REFRESH_COOKIE}=${refreshRaw}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('auth signup validation', () => {
  it('rejects password shorter than 10 characters', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/auth/signup')
      .send({
        email: 'new@test.com',
        password: 'short',
        org_name: 'Acme',
      });

    expect(res.status).toBe(400);
  });
});

describe('auth forgot-password', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockClientQuery.mockReset();
  });

  it('returns identical response whether email exists or not', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = createApp();
    const missing = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'missing@test.com' });

    expect(missing.status).toBe(200);
    expect(missing.body.ok).toBe(true);

    mockQuery.mockResolvedValue({ rows: [{ id: userId }] });
    mockConnect.mockResolvedValue({
      query: mockClientQuery.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes('INSERT INTO verificationtokens')) return { rows: [] };
        return { rows: [] };
      }),
      release: vi.fn(),
    });

    const exists = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'exists@test.com' });

    expect(exists.status).toBe(200);
    expect(exists.body.ok).toBe(missing.body.ok);
    expect(exists.body.message).toBe(missing.body.message);
  });
});

describe('authorization JWT tokenVersion', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('rejects access token when tokenversion mismatches', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('orgmembers')) {
        return { rows: [{ role: 'owner', plan: 'free', email: 'user@test.com', tokenversion: 1, emailverifiedat: null }] };
      }
      return { rows: [] };
    });

    const token = jwt.sign(
      { sub: userId, org: orgId, role: 'owner', plan: 'free', email: 'user@test.com', v: 0 },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' }
    );

    const app = createApp();
    const res = await request(app)
      .get('/orgs/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
