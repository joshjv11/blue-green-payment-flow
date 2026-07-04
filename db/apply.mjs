import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXPECTED_TABLES = [
  'users',
  'organizations',
  'orgmembers',
  'refreshtokens',
  'customers',
  'invoices',
  'dunningsequences',
  'invoicesequences',
  'reminderslog',
  'paymentlinks',
  'payments',
  'promisestopay',
  'activitylog',
  'subscriptions',
  'aiusage',
  'webhookevents',
];

const EXPECTED_EXTENSIONS = ['citext', 'pgcrypto'];

const SCHEMA_LOCK_KEY = 0x415243; // "ARC" — AR Collections schema apply lock

function resolveDatabaseUrl() {
  return (
    process.env.DATABASEURL ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL
  );
}

function sslConfig(connectionString) {
  if (/sslmode=disable/i.test(connectionString)) {
    return false;
  }
  if (/localhost|127\.0\.0\.1/i.test(connectionString)) {
    return false;
  }
  return { rejectUnauthorized: false };
}

async function verifySchema(client) {
  const [{ rows: tables }, { rows: extensions }, { rows: version }] =
    await Promise.all([
      client.query(
        `SELECT tablename
         FROM pg_tables
         WHERE schemaname = 'public'
           AND tablename = ANY($1::text[])
         ORDER BY tablename`,
        [EXPECTED_TABLES]
      ),
      client.query(
        `SELECT extname
         FROM pg_extension
         WHERE extname = ANY($1::text[])
         ORDER BY extname`,
        [EXPECTED_EXTENSIONS]
      ),
      client.query('SHOW server_version'),
    ]);

  const missingTables = EXPECTED_TABLES.filter(
    (name) => !tables.some((row) => row.tablename === name)
  );
  if (missingTables.length > 0) {
    throw new Error(`Missing tables after apply: ${missingTables.join(', ')}`);
  }

  const missingExtensions = EXPECTED_EXTENSIONS.filter(
    (name) => !extensions.some((row) => row.extname === name)
  );
  if (missingExtensions.length > 0) {
    throw new Error(
      `Missing extensions after apply: ${missingExtensions.join(', ')}`
    );
  }

  return version[0]?.server_version ?? 'unknown';
}

async function main() {
  const dbUrl = resolveDatabaseUrl();
  if (!dbUrl) {
    console.error('DATABASEURL (or DATABASE_URL) is required');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = new Client({
    connectionString: dbUrl,
    ssl: sslConfig(dbUrl),
  });

  let locked = false;

  try {
    await client.connect();
    console.log(`Connected. Applying schema from ${schemaPath} ...`);

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_LOCK_KEY]);
    locked = true;

    await client.query(sql);

    const serverVersion = await verifySchema(client);

    await client.query('COMMIT');
    console.log(`Schema applied successfully (PostgreSQL ${serverVersion}).`);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // connection may already be broken
    }
    const detail = err.detail ? `\n  detail: ${err.detail}` : '';
    const hint = err.hint ? `\n  hint: ${err.hint}` : '';
    console.error(`Schema apply failed: ${err.message}${detail}${hint}`);
    process.exitCode = 1;
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_LOCK_KEY]);
      } catch {
        // best-effort unlock
      }
    }
    await client.end();
  }
}

main();
