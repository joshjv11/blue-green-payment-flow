import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = vi.fn();
const mockConnect = vi.fn();

vi.mock('../src/db.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
    connect: () => mockConnect(),
  },
  checkDbConnection: vi.fn().mockResolvedValue(true),
}));

const { createApp } = await import('../src/app.js');

const orgA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const orgB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const userA = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const invoiceB = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const customerB = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

function tokenFor(orgId: string) {
  return jwt.sign(
    { sub: userA, org: orgId, role: 'owner', plan: 'pro', email: 'user@test.com', v: 0 },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256' }
  );
}

function mockAuthQuery() {
  mockQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes('orgmembers')) {
        return { rows: [{ role: 'owner', plan: 'pro', email: 'user@test.com', tokenversion: 0, emailverifiedat: new Date() }] };
    }
    if (sql.includes('FROM invoices') && params?.[0] === invoiceB && params?.[1] === orgA) {
      return { rows: [] };
    }
    if (sql.includes('FROM customers') && params?.[0] === customerB && params?.[1] === orgA) {
      return { rows: [] };
    }
    if (sql.includes('UPDATE organizations') && params?.[0] === orgB) {
      return { rows: [] };
    }
    return { rows: [] };
  });
}

describe('cross-org authorization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockAuthQuery();
  });

  it('returns 404 when org A token requests org B invoice', async () => {
    const app = createApp();
    const res = await request(app)
      .get(`/invoices/${invoiceB}`)
      .set('Authorization', `Bearer ${tokenFor(orgA)}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Invoice not found');
  });

  it('returns 404 when org A token requests org B customer', async () => {
    const app = createApp();
    const res = await request(app)
      .get(`/customers/${customerB}`)
      .set('Authorization', `Bearer ${tokenFor(orgA)}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Customer not found');
  });

  it('returns 403 when org A token patches org B profile', async () => {
    const app = createApp();
    const res = await request(app)
      .patch(`/orgs/${orgB}`)
      .set('Authorization', `Bearer ${tokenFor(orgA)}`)
      .send({ name: 'Hijacked Org' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('rejects orgid injection in invoice create body', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${tokenFor(orgA)}`)
      .send({
        orgid: orgB,
        customerid: '11111111-1111-1111-1111-111111111111',
        invoicenumber: 'INV-001',
        issuedate: '2026-01-01',
        duedate: '2026-02-01',
        amount: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });
});

describe('storage delete authorization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockAuthQuery();
  });

  it('returns 403 when deleting a file outside org prefix', async () => {
    const app = createApp();
    const res = await request(app)
      .delete('/storage/delete')
      .set('Authorization', `Bearer ${tokenFor(orgA)}`)
      .send({ filePath: `${orgB}/evil.pdf` });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
  });

  it('returns 403 for path traversal attempts', async () => {
    const app = createApp();
    const res = await request(app)
      .delete('/storage/delete')
      .set('Authorization', `Bearer ${tokenFor(orgA)}`)
      .send({ filePath: `${orgA}/../${orgB}/evil.pdf` });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid upload fileName', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/storage/sign-upload')
      .set('Authorization', `Bearer ${tokenFor(orgA)}`)
      .send({ fileName: '../../etc/passwd' });

    expect(res.status).toBe(400);
  });
});

describe('unknown routes', () => {
  it('returns 404 for unregistered paths', async () => {
    const app = createApp();
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
