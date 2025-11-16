import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: false }));
app.use(express.json());

// ENV
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PG_DATABASE_URL = process.env.DATABASE_URL || '';

// R2/S3
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || ''; // e.g. https://<accountid>.r2.cloudflarestorage.com

const s3 =
  R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT
    ? new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      })
    : undefined;

// Simple email/password validator (replace with your real auth)
const SignInBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

app.post('/auth/signin', async (req, res) => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Placeholder: in production verify against your users table with hashed passwords
  const { email } = parsed.data;
  const userId = process.env.DEV_USER_ID || '00000000-0000-0000-0000-000000000000';

  const token = jwt.sign(
    {
      sub: userId,
      role: 'authenticated',
      email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token });
});

// Generate simple object key path user_id/filename
const SignPutBody = z.object({
  key: z.string().min(1), // e.g. `${userId}/receipts/2025-01/file.jpg`
  contentType: z.string().optional(),
});

app.post('/storage/sign-put', async (req, res) => {
  if (!s3) return res.status(500).json({ error: 'R2 not configured' });
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const token = auth.slice('Bearer '.length);
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload?.sub as string;

    const parsed = SignPutBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { key, contentType } = parsed.data;

    if (!key.startsWith(userId)) {
      return res.status(403).json({ error: 'Key must start with your user id' });
    }

    // For R2, we can return a simple signed URL via presigned command; here we return a temporary upload URL alternative:
    // Minimal approach: client uploads via this service (streaming proxy). For production, switch to presigned URL.
    // To keep it simple, accept small files as base64 or raw body in a different route. Placeholder here returns direct path.
    const putUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${encodeURIComponent(key)}`;
    // Client should PUT directly if you implement presign; for now respond with key (integration step to follow).
    res.json({ url: putUrl, key, contentType });
  } catch (e: any) {
    return res.status(401).json({ error: e.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    pgConfigured: Boolean(PG_DATABASE_URL),
    r2Configured: Boolean(R2_ENDPOINT && R2_BUCKET),
  });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Auth/Storage API running on :${port}`);
});


