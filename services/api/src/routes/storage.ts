import { Router } from 'express';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

let s3: S3Client | null | undefined;

function getS3(): S3Client | null {
  if (s3 !== undefined) return s3;
  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  } else {
    s3 = null;
  }
  return s3;
}

function sanitizeFileName(fileName: unknown): string | null {
  const raw = String(fileName);
  if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\') || raw.includes('\0')) {
    return null;
  }
  return raw.replace(/[^\w.\-()+ ]/g, '_').slice(0, 200);
}

router.post('/sign-upload', requireAuth, async (req, res) => {
  const { fileName, contentType } = req.body;
  const safeFileName = sanitizeFileName(fileName);
  if (!safeFileName) return res.status(400).json({ error: 'Invalid fileName' });

  const client = getS3();
  if (!client || !env.R2_BUCKET) return res.status(500).json({ error: 'R2 not configured' });

  const orgId = req.auth!.orgId;
  const filePath = `${orgId}/${randomUUID()}-${safeFileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: filePath,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicUrl = env.R2_PUBLIC_DOMAIN
      ? `${env.R2_PUBLIC_DOMAIN}/${filePath}`
      : `${env.R2_ENDPOINT}/${env.R2_BUCKET}/${filePath}`;

    res.json({ uploadUrl, publicUrl, filePath });
  } catch (err) {
    console.error('sign-upload error', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

router.delete('/delete', requireAuth, async (req, res) => {
  const { filePath } = req.body;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'filePath is required' });
  }

  const orgId = req.auth!.orgId;
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('..') || !normalized.startsWith(`${orgId}/`)) {
    return res.status(403).json({ error: 'Forbidden: file does not belong to your organization' });
  }

  const client = getS3();
  if (!client || !env.R2_BUCKET) return res.status(500).json({ error: 'R2 not configured' });

  try {
    await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: normalized }));
    res.json({ ok: true });
  } catch (err) {
    console.error('delete error', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
