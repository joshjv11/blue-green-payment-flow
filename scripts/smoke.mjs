import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:8787';
const PGRST_URL = process.env.PGRST_URL || 'http://localhost:3000';

async function main() {
  console.log('Running smoke tests...');
  const health = await (await fetch(`${API_BASE}/health`)).json().catch(() => ({}));
  console.log('Auth API health:', health);

  const signin = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'password' }),
  }).then(r => r.json());
  const token = signin.token;
  console.log('Token?', Boolean(token));
  if (!token) {
    console.error('No token from /auth/signin');
    process.exit(1);
  }

  const bills = await fetch(`${PGRST_URL}/bills?select=id,title,amount,created_at&order=created_at.desc&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).catch(() => []);
  console.log('Bills sample:', bills);
  console.log('✅ Smoke tests finished');
}

main().catch((e) => {
  console.error('Smoke failed', e);
  process.exit(1);
});


