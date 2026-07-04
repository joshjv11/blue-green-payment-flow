import type { Pool, PoolClient } from 'pg';

/** SQL fragment: orgid = $N — always bind orgId from verified JWT, never from request body. */
export function orgFilter(paramIndex = 1): string {
  return `orgid = $${paramIndex}`;
}

/** Prefix query params with orgId from JWT. */
export function orgParams(orgId: string, ...rest: unknown[]): unknown[] {
  return [orgId, ...rest];
}

type Queryable = Pick<Pool, 'query'>;

export async function findCustomerInOrg(
  db: Queryable,
  customerId: string,
  orgId: string
): Promise<{ id: string } | null> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM customers WHERE id = $1 AND ${orgFilter(2)} LIMIT 1`,
    [customerId, orgId]
  );
  return rows[0] ?? null;
}

export async function findInvoiceInOrg(
  db: Queryable,
  invoiceId: string,
  orgId: string
): Promise<{ id: string; invoicenumber: string } | null> {
  const { rows } = await db.query<{ id: string; invoicenumber: string }>(
    `SELECT id, invoicenumber FROM invoices WHERE id = $1 AND ${orgFilter(2)} LIMIT 1`,
    [invoiceId, orgId]
  );
  return rows[0] ?? null;
}

export async function reserveAiUsageSlot(
  db: Pool,
  orgId: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const client: PoolClient = await db.connect();
  const today = new Date().toISOString().slice(0, 10);

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`aiusage:${orgId}:${today}`]);

    const existing = await client.query<{ count: number }>(
      `SELECT count FROM aiusage WHERE orgid = $1 AND usagedate = $2 FOR UPDATE`,
      [orgId, today]
    );

    const current = existing.rows[0]?.count ?? 0;
    if (current >= limit) {
      await client.query('ROLLBACK');
      return { allowed: false, remaining: 0 };
    }

    const { rows } = await client.query<{ count: number }>(
      `INSERT INTO aiusage (orgid, usagedate, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (orgid, usagedate)
       DO UPDATE SET count = aiusage.count + 1, updatedat = NOW()
       RETURNING count`,
      [orgId, today]
    );

    const count = rows[0]?.count ?? current + 1;
    await client.query('COMMIT');
    return { allowed: true, remaining: Math.max(0, limit - count) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function releaseAiUsageSlot(db: Pool, orgId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.query(
    `UPDATE aiusage SET count = GREATEST(0, count - 1), updatedat = NOW()
     WHERE orgid = $1 AND usagedate = $2 AND count > 0`,
    [orgId, today]
  );
}
