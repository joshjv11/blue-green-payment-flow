import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  OCR_TESSERACT_LANG: z.string().default("eng"),
  OCR_CONFIDENCE_THRESHOLD: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseFloat(value) : undefined))
    .pipe(z.number().min(0).max(1).optional()),
  OCR_MAX_PAGES: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  OCR_QUEUE_CONCURRENCY: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  OCR_SYNC_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
});

export const env = envSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  REDIS_URL: process.env.REDIS_URL,
  OCR_TESSERACT_LANG: process.env.OCR_TESSERACT_LANG,
  OCR_CONFIDENCE_THRESHOLD: process.env.OCR_CONFIDENCE_THRESHOLD,
  OCR_MAX_PAGES: process.env.OCR_MAX_PAGES,
  OCR_QUEUE_CONCURRENCY: process.env.OCR_QUEUE_CONCURRENCY,
  OCR_SYNC_TIMEOUT_MS: process.env.OCR_SYNC_TIMEOUT_MS,
});

export const CONFIDENCE_THRESHOLD = env.OCR_CONFIDENCE_THRESHOLD ?? 0.75;
export const MAX_PAGES = env.OCR_MAX_PAGES ?? 10;
export const QUEUE_CONCURRENCY = env.OCR_QUEUE_CONCURRENCY ?? 2;
export const DEFAULT_LANGUAGE = env.OCR_TESSERACT_LANG ?? "eng";
export const SYNC_TIMEOUT_MS = env.OCR_SYNC_TIMEOUT_MS ?? 45000;

