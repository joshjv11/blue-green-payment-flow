#!/usr/bin/env node
/**
 * Point invoiceflow.dev DNS at Vercel and register the domain on the Vercel project.
 *
 * Required env:
 *   GODADDY_API_KEY, GODADDY_API_SECRET — GoDaddy API (sso-key)
 *   VERCEL_TOKEN — Vercel personal/team token
 *
 * Optional:
 *   DOMAIN (default: invoiceflow.dev)
 *   VERCEL_PROJECT (default: blue-green-payment-flow)
 *   VERCEL_TEAM (default: joshs-projects-3930381e)
 *   VERCEL_A_RECORD (default: 76.76.21.21)
 *   VERCEL_WWW_CNAME (default: cname.vercel-dns.com)
 */

const DOMAIN = process.env.DOMAIN || 'invoiceflow.dev';
const VERCEL_PROJECT = process.env.VERCEL_PROJECT || 'blue-green-payment-flow';
const VERCEL_TEAM = process.env.VERCEL_TEAM || 'joshs-projects-3930381e';
const VERCEL_A_RECORD = process.env.VERCEL_A_RECORD || '76.76.21.21';
const VERCEL_WWW_CNAME = process.env.VERCEL_WWW_CNAME || 'cname.vercel-dns.com';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

async function godaddyRequest(method, path, body) {
  const key = requireEnv('GODADDY_API_KEY');
  const secret = requireEnv('GODADDY_API_SECRET');
  const res = await fetch(`https://api.godaddy.com/v1${path}`, {
    method,
    headers: {
      Authorization: `sso-key ${key}:${secret}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GoDaddy ${method} ${path} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function updateGoDaddyDns() {
  console.log(`Updating GoDaddy DNS for ${DOMAIN} → Vercel (${VERCEL_A_RECORD})`);

  await godaddyRequest('PUT', `/domains/${DOMAIN}/records/A/@`, [
    { data: VERCEL_A_RECORD, ttl: 600 },
  ]);
  console.log(`  ✓ A @ → ${VERCEL_A_RECORD}`);

  await godaddyRequest('PUT', `/domains/${DOMAIN}/records/CNAME/www`, [
    { data: VERCEL_WWW_CNAME, ttl: 600 },
  ]);
  console.log(`  ✓ CNAME www → ${VERCEL_WWW_CNAME}`);
}

async function addVercelDomain(name) {
  const token = requireEnv('VERCEL_TOKEN');
  const teamQuery = VERCEL_TEAM ? `?slug=${encodeURIComponent(VERCEL_TEAM)}` : '';
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(VERCEL_PROJECT)}/domains${teamQuery}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    }
  );
  const data = await res.json();
  if (res.ok || data?.error?.code === 'domain_already_in_use' || res.status === 409) {
    console.log(`  ✓ Vercel domain registered: ${name}`);
    return;
  }
  throw new Error(`Vercel add domain ${name} failed (${res.status}): ${JSON.stringify(data)}`);
}

async function main() {
  await addVercelDomain(DOMAIN);
  await addVercelDomain(`www.${DOMAIN}`);
  await updateGoDaddyDns();
  console.log('\nDone. DNS may take 5–30 minutes to propagate globally.');
  console.log(`Verify: curl -sI https://${DOMAIN} | head -5`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
