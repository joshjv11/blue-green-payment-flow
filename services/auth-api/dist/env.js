import { z } from 'zod';
// Normalize aliases before Zod validation (matches db/apply.mjs conventions).
if (!process.env.DATABASE_URL && process.env.DATABASEURL) {
    process.env.DATABASE_URL = process.env.DATABASEURL;
}
if (!process.env.JWT_SECRET && process.env.JWTSECRET) {
    process.env.JWT_SECRET = process.env.JWTSECRET;
}
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(8787),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    CORS_ORIGINS: z.string().optional(),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(30),
    APP_URL: z.string().default('https://invoiceflow.dev'),
    EMAIL_FROM: z.string().default('InvoiceFlow <noreply@invoiceflow.dev>'),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_ENDPOINT: z.string().optional(),
    R2_PUBLIC_DOMAIN: z.string().optional(),
    UPI_ID: z.string().optional(),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    WHATSAPP_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    RBI_BANK_RATE: z.coerce.number().default(6.75),
    AI_DAILY_LIMIT_PRO: z.coerce.number().default(50),
});
function parseEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const missing = result.error.issues.map((i) => i.message).join('; ');
        console.error(`Environment validation failed: ${missing}`);
        process.exit(1);
    }
    const env = result.data;
    const isProduction = env.NODE_ENV === 'production';
    if (isProduction && env.JWT_SECRET.length < 32) {
        console.warn('JWT_SECRET is shorter than 32 characters — acceptable for migration, rotate when possible');
    }
    if (isProduction && (!env.CORS_ORIGINS || env.CORS_ORIGINS.trim() === '')) {
        console.warn('CORS_ORIGINS not set — using default production origins');
    }
    const corsOrigins = env.CORS_ORIGINS
        ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
        : isProduction
            ? [
                env.APP_URL,
                'https://invoiceflow.dev',
                'https://www.invoiceflow.dev',
                'https://blue-green-payment-flow.vercel.app',
            ]
            : ['http://localhost:5173', 'http://localhost:8080'];
    if (isProduction && corsOrigins.includes('*')) {
        console.error('Environment validation failed: CORS_ORIGINS must not include * in production');
        process.exit(1);
    }
    return { ...env, corsOrigins };
}
export const env = parseEnv();
