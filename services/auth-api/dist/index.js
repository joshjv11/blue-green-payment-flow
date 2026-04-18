import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { createHmac, randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: false }));
// Webhook needs raw body for HMAC verification — must come before express.json().
// All other routes get standard JSON parsing via a conditional middleware.
app.use((req, res, next) => {
    if (req.path === '/api/razorpay-webhook') {
        express.raw({ type: 'application/json' })(req, res, next);
    }
    else {
        express.json()(req, res, next);
    }
});
// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '';
const s3 = R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT
    ? new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    })
    : null;
// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
function verifyToken(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        throw Object.assign(new Error('No token'), { status: 401 });
    const token = auth.slice('Bearer '.length);
    return jwt.verify(token, JWT_SECRET);
}
function requireAuth(req, res, next) {
    try {
        req.jwtPayload = verifyToken(req);
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
}
// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const SignInBody = z.object({ email: z.string().email(), password: z.string().min(6) });
const SignUpBody = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().optional(),
    company: z.string().optional(),
});
// ---------------------------------------------------------------------------
// ROUTE: Health
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        pgConfigured: Boolean(pool),
        r2Configured: Boolean(s3 && R2_BUCKET),
    });
});
// ---------------------------------------------------------------------------
// ROUTE: Sign In
// ---------------------------------------------------------------------------
app.post('/auth/signin', async (req, res) => {
    const parsed = SignInBody.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const { email, password } = parsed.data;
    if (!pool)
        return res.status(500).json({ error: 'Database not configured' });
    try {
        const result = await pool.query('SELECT id, email, full_name, company, password_hash FROM profiles WHERE email = $1 LIMIT 1', [email]);
        const user = result.rows[0];
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ sub: user.id, role: 'authenticated', email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name ?? null,
                company: user.company ?? null,
                user_metadata: { full_name: user.full_name, company: user.company },
            },
        });
    }
    catch (err) {
        console.error('signin error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: Sign Up
// ---------------------------------------------------------------------------
app.post('/auth/signup', async (req, res) => {
    const parsed = SignUpBody.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid request body' });
    const { email, password, full_name, company } = parsed.data;
    if (!pool)
        return res.status(500).json({ error: 'Database not configured' });
    try {
        // Check existing
        const existing = await pool.query('SELECT id FROM profiles WHERE email = $1 LIMIT 1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        const password_hash = await bcrypt.hash(password, 12);
        const id = randomUUID();
        await pool.query(`INSERT INTO profiles (id, email, full_name, company, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`, [id, email, full_name ?? null, company ?? null, password_hash]);
        const token = jwt.sign({ sub: id, role: 'authenticated', email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            token,
            user: {
                id,
                email,
                full_name: full_name ?? null,
                company: company ?? null,
                user_metadata: { full_name, company },
            },
        });
    }
    catch (err) {
        console.error('signup error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: Reset Password (stub — send email via your preferred provider)
// ---------------------------------------------------------------------------
app.post('/auth/reset-password', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    // TODO: send reset email via SendGrid / Resend etc.
    console.log('Password reset requested for:', email);
    res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// ROUTE: Magic Link (stub)
// ---------------------------------------------------------------------------
app.post('/auth/magic-link', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    // TODO: send magic link email
    console.log('Magic link requested for:', email);
    res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// ROUTE: Storage — presigned upload URL (Cloudflare R2)
// ---------------------------------------------------------------------------
app.post('/storage/sign-upload', requireAuth, async (req, res) => {
    if (!s3 || !R2_BUCKET)
        return res.status(500).json({ error: 'R2 not configured' });
    const { fileName, contentType } = req.body;
    if (!fileName)
        return res.status(400).json({ error: 'fileName is required' });
    // Strip path separators and null bytes to prevent path traversal
    const safeFileName = String(fileName).replace(/[/\\.\0]+/g, '_').slice(0, 200);
    const userId = req.jwtPayload.sub;
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;
    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: filePath,
            ContentType: contentType || 'application/octet-stream',
        });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        const publicUrl = R2_PUBLIC_DOMAIN
            ? `${R2_PUBLIC_DOMAIN}/${filePath}`
            : `${R2_ENDPOINT}/${R2_BUCKET}/${filePath}`;
        res.json({ uploadUrl, publicUrl, filePath });
    }
    catch (err) {
        console.error('sign-upload error', err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: Storage — delete object
// ---------------------------------------------------------------------------
app.delete('/storage/delete', requireAuth, async (req, res) => {
    if (!s3 || !R2_BUCKET)
        return res.status(500).json({ error: 'R2 not configured' });
    const { filePath } = req.body;
    if (!filePath)
        return res.status(400).json({ error: 'filePath is required' });
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: filePath }));
        res.json({ ok: true });
    }
    catch (err) {
        console.error('delete error', err);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: Generate Payment Link  (ported from supabase/functions/generate-payment-link)
// ---------------------------------------------------------------------------
app.post('/api/generate-payment-link', requireAuth, async (req, res) => {
    if (!pool)
        return res.status(500).json({ error: 'Database not configured' });
    const payload = req.jwtPayload;
    const userId = payload.sub;
    const { amount, currency = 'INR', gateway, customerId, invoiceId, saleOrderId, billId, notes, } = req.body;
    if (!amount || !gateway) {
        return res.status(400).json({ error: 'amount and gateway are required' });
    }
    try {
        let paymentLinkUrl = '';
        let qrCodeUrl = '';
        let upiId = '';
        let providerReferenceId = '';
        if (gateway === 'upi') {
            const configUpiId = process.env.UPI_ID || 'joshuavaz55@okicici';
            upiId = configUpiId;
            const upiString = `upi://pay?pa=${upiId}&pn=InvoiceFlow&am=${amount}&cu=${currency}&tn=${encodeURIComponent(notes || 'Payment')}`;
            paymentLinkUrl = upiString;
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
        }
        else if (gateway === 'razorpay') {
            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!keyId || !keySecret) {
                return res.status(500).json({ error: 'Razorpay keys not configured' });
            }
            const referenceId = saleOrderId || invoiceId || billId || `generic-${userId}-${Date.now()}`;
            const rpPayload = {
                amount: Math.round(amount * 100),
                currency: currency || 'INR',
                description: notes || 'Payment',
                reference_id: referenceId,
                notify: { sms: true, email: true },
                reminder_enable: true,
                accept_partial: false,
            };
            const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
            const rpRes = await fetch('https://api.razorpay.com/v1/payment_links', {
                method: 'POST',
                headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(rpPayload),
            });
            const rp = await rpRes.json();
            if (!rpRes.ok) {
                console.error('Razorpay error:', rp);
                return res.status(rpRes.status).json({ error: rp?.error || rp });
            }
            paymentLinkUrl = rp?.short_url || rp?.url || '';
            providerReferenceId = rp?.id || '';
        }
        else {
            return res.status(400).json({ error: `Gateway '${gateway}' not supported. Use razorpay or upi.` });
        }
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        const { rows } = await pool.query(`INSERT INTO payment_links
         (user_id, customer_id, invoice_id, sale_order_id, bill_id, amount, currency,
          payment_gateway, payment_link_url, qr_code_url, upi_id, status, expires_at, notes, payment_reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,$13,$14)
       RETURNING id`, [
            userId, customerId ?? null, invoiceId ?? null, saleOrderId ?? null,
            billId ?? null, amount, currency, gateway, paymentLinkUrl,
            qrCodeUrl || null, upiId || null, expiresAt.toISOString(),
            notes ?? null, providerReferenceId || null,
        ]);
        res.json({
            success: true,
            paymentLink: {
                id: rows[0].id,
                url: paymentLinkUrl,
                qrCodeUrl,
                upiId,
                amount,
                currency,
                gateway,
                expiresAt: expiresAt.toISOString(),
                providerReferenceId,
            },
        });
    }
    catch (err) {
        console.error('generate-payment-link error', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: Razorpay Webhook  (ported from supabase/functions/razorpay-webhook)
// ---------------------------------------------------------------------------
app.post('/api/razorpay-webhook', async (req, res) => {
    if (!pool)
        return res.status(500).json({ error: 'Database not configured' });
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret)
        return res.status(500).json({ error: 'Webhook secret not configured' });
    const bodyText = req.body.toString('utf8');
    const sig = req.headers['x-razorpay-signature'] || '';
    // Verify HMAC-SHA256 signature
    const expected = createHmac('sha256', secret).update(bodyText).digest('hex');
    if (expected !== sig) {
        return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }
    try {
        const event = JSON.parse(bodyText);
        console.log('Razorpay webhook event:', event.event);
        if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
            const paymentLinkEntity = event.payload?.payment_link?.entity;
            const paymentEntity = event.payload?.payment?.entity;
            const amountPaise = paymentLinkEntity?.amount || paymentEntity?.amount || 0;
            const amount = amountPaise / 100;
            const referenceId = paymentLinkEntity?.reference_id || paymentEntity?.notes?.reference_id || '';
            const razorpayLinkId = paymentLinkEntity?.id || paymentEntity?.payment_link_id || '';
            // Find payment_links record
            let paymentLinkRecord = null;
            if (razorpayLinkId) {
                const { rows } = await pool.query(`SELECT * FROM payment_links WHERE payment_reference = $1 LIMIT 1`, [razorpayLinkId]);
                paymentLinkRecord = rows[0] || null;
            }
            if (!paymentLinkRecord && referenceId) {
                const { rows } = await pool.query(`SELECT * FROM payment_links WHERE notes = $1 LIMIT 1`, [referenceId]);
                paymentLinkRecord = rows[0] || null;
            }
            // Resolve userId
            let userId = paymentLinkRecord?.user_id;
            if (!userId && referenceId) {
                const match = referenceId.match(/(?:pro|premium)-(.+)/);
                if (match)
                    userId = match[1];
            }
            if (!userId && paymentEntity?.notes?.user_id)
                userId = paymentEntity.notes.user_id;
            if (userId) {
                await pool.query(`INSERT INTO payment_transactions (user_id, amount, status, transaction_id, notes, created_at)
           VALUES ($1,$2,'verified',$3,$4,NOW())`, [userId, amount, paymentEntity?.id || razorpayLinkId, `Razorpay webhook ${event.event}`]);
            }
            if (paymentLinkRecord?.id) {
                await pool.query(`UPDATE payment_links SET status='paid', paid_at=NOW() WHERE id=$1`, [paymentLinkRecord.id]);
            }
            // Determine plan
            let planType = null;
            const planMatch = referenceId?.match(/^(pro|premium)-/);
            if (planMatch)
                planType = planMatch[1];
            if (!planType) {
                if (amount === 99)
                    planType = 'pro';
                else if (amount === 999)
                    planType = 'premium';
            }
            if (planType && userId) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);
                await pool.query(`INSERT INTO user_plans (user_id, plan, is_active, started_at, expires_at, ai_queries_limit)
           VALUES ($1,$2,true,NOW(),$3,$4)
           ON CONFLICT (user_id) DO UPDATE
             SET plan=EXCLUDED.plan, is_active=true, started_at=NOW(),
                 expires_at=EXCLUDED.expires_at, ai_queries_limit=EXCLUDED.ai_queries_limit`, [userId, planType, expiresAt.toISOString(), 999999]);
                await pool.query(`UPDATE payment_transactions SET processed=true
           WHERE user_id=$1 AND status='verified' AND (processed IS FALSE OR processed IS NULL)`, [userId]);
                console.log(`✅ Auto-activated ${planType} plan for user ${userId}`);
            }
        }
        res.json({ ok: true });
    }
    catch (err) {
        console.error('razorpay-webhook error', err);
        res.status(500).json({ error: String(err) });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: Reconcile ITC  (ported from supabase/functions/reconcile-itc)
// ---------------------------------------------------------------------------
app.post('/api/reconcile-itc', requireAuth, async (req, res) => {
    if (!pool)
        return res.status(500).json({ error: 'Database not configured' });
    const userId = req.jwtPayload.sub;
    const { period, auto_download_form2a = false } = req.body || {};
    try {
        // Check Premium plan
        const { rows: planRows } = await pool.query(`SELECT plan, is_active FROM user_plans WHERE user_id = $1 LIMIT 1`, [userId]);
        const userPlan = planRows[0];
        if (!userPlan || userPlan.plan !== 'premium' || !userPlan.is_active) {
            return res.status(403).json({ error: 'ITC reconciliation is available only for Premium plan users' });
        }
        // Build purchase orders query
        let purchaseQuery = `SELECT * FROM purchase_orders WHERE user_id = $1`;
        const queryParams = [userId];
        if (period) {
            const [year, month] = period.split('-');
            const startDate = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
            purchaseQuery += ` AND transaction_date >= $2 AND transaction_date <= $3`;
            queryParams.push(startDate, endDate);
        }
        purchaseQuery += ' ORDER BY transaction_date DESC';
        const { rows: purchases } = await pool.query(purchaseQuery, queryParams);
        if (!purchases.length) {
            return res.status(404).json({ error: 'No purchase orders found' });
        }
        const reconciliationResults = [];
        const mismatches = [];
        for (const purchase of purchases) {
            const itcEligible = parseFloat(purchase.tax_amount) || 0;
            // Without Form 2A/2B download the status starts as 'pending'; once matched it becomes 'matched'
            const reconciliationStatus = 'pending';
            const { rows: upsertRows } = await pool.query(`INSERT INTO itc_reconciliation
           (user_id, purchase_order_id, gstin, invoice_number, invoice_date, invoice_value,
            tax_amount, itc_eligible, itc_claimed, reconciliation_status, reconciled_at,
            reconciled_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,NOW(),'auto',NOW())
         ON CONFLICT (user_id, invoice_number, invoice_date)
         DO UPDATE SET
           tax_amount=EXCLUDED.tax_amount, itc_eligible=EXCLUDED.itc_eligible,
           reconciliation_status=EXCLUDED.reconciliation_status,
           reconciled_at=NOW(), updated_at=NOW()
         RETURNING *`, [
                userId, purchase.id, purchase.supplier_gstin || '',
                purchase.invoice_number, purchase.transaction_date,
                parseFloat(purchase.grand_total) || 0,
                parseFloat(purchase.tax_amount) || 0,
                itcEligible, reconciliationStatus,
            ]);
            if (upsertRows[0])
                reconciliationResults.push(upsertRows[0]);
        }
        res.json({
            success: true,
            reconciled_count: reconciliationResults.length,
            matched_count: reconciliationResults.filter(r => r.reconciliation_status === 'matched').length,
            mismatch_count: mismatches.length,
            mismatches,
            message: 'ITC reconciliation completed',
        });
    }
    catch (err) {
        console.error('reconcile-itc error', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// ---------------------------------------------------------------------------
// ROUTE: AI Assistant  (ported from supabase/functions/ai-assistant)
// ---------------------------------------------------------------------------
app.post('/api/ai-assistant', requireAuth, async (req, res) => {
    const { message, bills, context } = req.body;
    if (!message)
        return res.status(400).json({ error: 'message is required' });
    const groqApiKey = process.env.GROQ_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const billsContext = (bills || []).map((bill) => ({
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.due_date,
        category: bill.category,
        status: bill.status,
        notes: bill.notes,
    }));
    const systemPrompt = `You are InvoiceFlow's AI assistant, helping users manage their bills and payments effectively.

Context about the user's bills:
${JSON.stringify(billsContext, null, 2)}

Guidelines:
- Be helpful, friendly, and concise
- Provide actionable advice for bill management
- When generating email templates, make them professional but friendly
- Always reference specific bill data when relevant
- Suggest practical payment strategies
- Help with financial organization and planning
- For summaries, be clear and highlight important insights

Current context: ${context || 'General bill management assistance'}`;
    let aiResponse = null;
    // Try Groq first (free tier)
    if (groqApiKey && !aiResponse) {
        try {
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message },
                    ],
                    max_tokens: 1000,
                    temperature: 0.7,
                }),
            });
            if (groqRes.ok) {
                const groqData = await groqRes.json();
                aiResponse = groqData.choices?.[0]?.message?.content || null;
            }
            else {
                console.warn('⚠️ Groq error:', groqRes.status);
            }
        }
        catch (err) {
            console.warn('⚠️ Groq failed:', err);
        }
    }
    // Fallback to OpenAI
    if (!aiResponse && openaiApiKey) {
        try {
            const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message },
                    ],
                    max_tokens: 1000,
                    temperature: 0.7,
                }),
            });
            if (!oaiRes.ok) {
                const errText = await oaiRes.text();
                throw new Error(`OpenAI error: ${oaiRes.status} ${errText}`);
            }
            const oaiData = await oaiRes.json();
            aiResponse = oaiData.choices?.[0]?.message?.content || null;
        }
        catch (err) {
            console.error('❌ OpenAI failed:', err);
        }
    }
    if (!aiResponse) {
        return res.status(503).json({
            success: false,
            error: 'No AI API keys configured. Set GROQ_API_KEY or OPENAI_API_KEY.',
        });
    }
    res.json({ success: true, response: aiResponse });
});
// ---------------------------------------------------------------------------
// ROUTE: PostgREST proxy
//
// The browser cannot call PostgREST directly because PostgREST doesn't send
// CORS headers for cross-origin requests. This transparent proxy solves that:
// the browser talks to THIS server (CORS enabled), and we forward the request
// to PostgREST on Render's internal network.
//
// Frontend: set VITE_PGRST_URL = https://<this-service>.onrender.com/db
// Render:   set POSTGREST_URL  = https://invoiceflow-postgrest.onrender.com
// ---------------------------------------------------------------------------
const POSTGREST_INTERNAL_URL = (process.env.POSTGREST_URL || '').replace(/\/$/, '');
app.use('/db', async (req, res) => {
    if (!POSTGREST_INTERNAL_URL) {
        res.status(500).json({ error: 'POSTGREST_URL is not configured on the server.' });
        return;
    }
    // req.url already contains the path + query string relative to /db
    const targetUrl = `${POSTGREST_INTERNAL_URL}${req.url}`;
    try {
        const forwardHeaders = {};
        // Forward the JWT so PostgREST RLS policies still apply
        const auth = req.headers.authorization;
        if (auth)
            forwardHeaders['Authorization'] = auth;
        // PostgREST-specific request headers
        const prefer = req.headers['prefer'];
        if (prefer)
            forwardHeaders['Prefer'] = prefer;
        const accept = req.headers['accept'];
        if (accept)
            forwardHeaders['Accept'] = accept;
        if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
            forwardHeaders['Content-Type'] = 'application/json';
        }
        const pgResponse = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: ['POST', 'PATCH', 'PUT'].includes(req.method)
                ? JSON.stringify(req.body)
                : undefined,
        });
        // Forward PostgREST metadata headers the client may need
        const contentRange = pgResponse.headers.get('content-range');
        if (contentRange)
            res.setHeader('Content-Range', contentRange);
        const contentType = pgResponse.headers.get('content-type');
        if (contentType)
            res.setHeader('Content-Type', contentType);
        const text = await pgResponse.text();
        res.status(pgResponse.status).send(text);
    }
    catch (err) {
        console.error('PostgREST proxy error:', err);
        res.status(502).json({ error: 'Failed to reach PostgREST: ' + err.message });
    }
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
    console.log(`Auth/Storage API running on :${port}`);
    console.log(`PostgREST proxy: ${POSTGREST_INTERNAL_URL ? POSTGREST_INTERNAL_URL : 'NOT CONFIGURED — set POSTGREST_URL'}`);
});
