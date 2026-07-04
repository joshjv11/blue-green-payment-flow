# InvoiceFlow — Pivot Plan, Security Audit & Cursor Rebuild Prompts

**Date:** 2026-07-04
**Status of repo analyzed:** `main` @ `9c1d7aa` (React/Vite frontend + Express auth-api + PostgREST, no live database)

This document has six parts:

1. Honest assessment of the current product & business model
2. The YC comparison (Swipe — what you're currently cloning; Upflow — what you should copy)
3. The pivot: **InvoiceFlow = Accounts Receivable collections automation for Indian SMEs**
4. Infrastructure: the ₹0-to-start stack (drop PostgREST, drop Supabase, use Neon)
5. Full security & code flaw inventory (with file:line references)
6. Phased, copy-paste-ready Cursor prompts to execute the rebuild

---

## Part 1 — Honest assessment of what you have

### The product today

The app is a Lovable-generated "everything for SMEs" platform: bills, GST invoicing, GSTR filing, ITC reconciliation, e-invoicing, inventory, sales, purchases, EMI manager, savings goals, expense tracking, OCR, AI coach, WhatsApp broadcast, admin CMS, analytics — **45 pages, ~80 components, 28+ "features."**

### Why the current business model does not work

1. **You are competing with free, funded products.** Swipe (YC S21), Vyapar, myBillBook, and Zoho Invoice (literally free) already do GST invoicing for Indian SMEs. Swipe alone claims 2.5M+ businesses. Your ₹99/₹999 tiers are selling what the market already gets free, from companies with sales teams and referral networks.
2. **Horizontal breadth, zero depth.** 28 features means none of them is the best at anything. An SME picks Vyapar because it nails one workflow; nobody picks the 28-feature app from an unknown brand.
3. **Feature gating is client-side.** `PlanGate`, `PremiumGuard`, `RequirePlan` are React components. Anyone with DevTools gets Premium free. Your own strategy doc (`PRODUCT_STRATEGY_EXECUTIVE_SUMMARY.md`) admits "Free users accessing paid features."
4. **Plan activation is broken by design.** The Razorpay webhook grants plans by matching payment *amount* (₹99 → pro, ₹999 → premium) — see the exploit in Part 5, item 8. Revenue infrastructure this fragile can't be a business.
5. **Infra costs were driven by architecture, not customers.** Supabase got expensive because the app hits the DB for everything (analytics materialized views, realtime, per-keystroke queries). The fix is architectural, not "find cheaper Supabase."

### What is genuinely salvageable

- The **brand/domain**: "InvoiceFlow" is a great name for a product about *money flowing from invoices*.
- The **payment-link + UPI + Razorpay webhook plumbing** (needs security fixes, but the rails exist).
- The **WhatsApp integration concept** (India's #1 business communication channel).
- The **invoice PDF generation** (`@react-pdf/renderer` pipeline).
- The **Express auth-api skeleton** — right idea (own your backend), wrong details.
- shadcn/Tailwind UI system — presentable frontend fast.

Everything else — inventory, EMI, savings goals, GSTR filing, admin CMS, OCR workbench, AI coach — is dead weight for the pivot. Delete it.

---

## Part 2 — The YC comparison

### The company you're currently (accidentally) cloning: **Swipe (YC S21)**

- Indian GST invoicing/billing for SMEs. Free core product. 2.5M+ businesses. Raised ~$2M from YC, GFC, Soma Capital, Kunal Shah.
- **Lesson:** the "make invoices" market in India is winner-mostly-taken and monetizes terribly (free products, ₹1,000/yr price points). You cannot out-Swipe Swipe with no funding.

### The company you should copy: **Upflow (YC W19/W20, France→US)**

- **What they do:** Accounts Receivable automation — they don't help you *create* invoices, they help you *get paid* for them. Automated, personalized reminder sequences (email + other channels), a customer-facing payment portal, AR analytics (DSO, aging), and now their own B2B payment rails and roadmap into factoring/BNPL.
- **Why it's a great business:** it plugs into whatever invoicing/accounting tool the customer already uses (no rip-and-replace), the ROI is instantly measurable ("we recovered ₹X faster"), and it naturally expands into payments (take a cut of the flow) and financing (factoring margins). 500+ companies across 30 countries, targeting $10M–$500M revenue businesses.
- **Why the moat survives AI:** collections is *workflow + payment rails + trust + compliance*, not content generation. AI makes the reminder copy better (a feature you ship), it doesn't replace the system of record for "who owes whom, what was promised, and what legal remedy applies." The payment rails and the compliance layer (Part 3) are not AI-replaceable.

### Nobody has built Upflow for Indian SMEs

India has enterprise AR tools (HighRadius — Hyderabad-born, but sells to Fortune 500) and invoice *creation* tools (Swipe, Vyapar). The **SME "get me paid" layer — automated WhatsApp + email dunning, UPI payment links on every reminder, promise-to-pay tracking, MSME Act interest calculators — is wide open.** That's the gap.

---

## Part 3 — The Pivot

### One-liner

> **InvoiceFlow: Get your invoices paid. Automated WhatsApp + email payment reminders, UPI payment links, and MSME late-payment compliance for Indian small businesses.**

You stop being the 29-feature accounting app and become the **collections layer** on top of whatever the SME already uses.

### Why this problem is huge, common, and durable

- **₹47,677 crore** in delayed-payment claims filed by micro & small enterprises on the MSME Samadhaan portal (216,221 applications through Dec 2024) — and that's only the businesses that bothered to file. Industry estimates of total working capital locked in MSME receivables run into lakhs of crores.
- **Section 43B(h) of the Income Tax Act (effective April 1, 2024)** — buyers who don't pay MSME suppliers within 15 days (no written agreement) / 45 days (with agreement) **lose the tax deduction** for that expense until the year they actually pay. This is a legally-mandated forcing function that makes *your reminder emails scary in a way no US product has*: "Pay this invoice by &lt;date&gt; or you lose the deduction under 43B(h)" is the highest-converting dunning message in the world right now, and it exists only in India.
- **MSMED Act, 2006** entitles suppliers to **compound interest at 3× the RBI bank rate** on late payments. Almost no SME calculates or claims it. A one-click "late payment interest calculator + demand letter generator" is a killer wedge feature.
- WhatsApp is where Indian business communication happens. US dunning tools are email-first; India needs WhatsApp-first. That's your localization moat.

### The product (v1 scope — nothing more)

1. **Import/create invoices** (manual entry, CSV upload; Tally/Zoho/Swipe import later). You keep the existing invoice form + PDF generation.
2. **Dunning sequences**: templated reminder schedules (e.g., T-3 days friendly, T+1 firm, T+7 with 43B(h) notice, T+15 with MSMED interest demand), sent via WhatsApp + email, automatically, per-customer tone settings.
3. **Payment link on every touch**: UPI deep link + QR + Razorpay link embedded in every reminder and on the invoice page.
4. **Customer-facing invoice page** (`pay.invoiceflow.dev/i/<token>`): the debtor sees the invoice, the running MSMED interest meter, and a Pay Now button. No login required. This page is your viral loop — every debtor sees your brand.
5. **Promise-to-pay tracking**: log "customer said 15th", auto-follow-up on the 16th.
6. **AR dashboard**: aging buckets, DSO, expected cash this week, worst offenders.
7. **43B(h)/MSMED toolkit**: Udyam registration capture, interest calculator, demand-letter PDF generator, MSME Samadhaan filing checklist.

### Business model

| Tier | Price | What it maps to |
|---|---|---|
| Free | ₹0 | 10 active invoices, manual reminders, payment links (you eat ~₹0 cost; WhatsApp conversations are the only marginal cost) |
| Pro | **₹499/mo or ₹4,999/yr** | Unlimited invoices, automated sequences, WhatsApp channel, promise-to-pay, AR dashboard |
| Business | **₹1,499/mo** | Multi-user, custom sequences, 43B(h)/MSMED toolkit, priority WhatsApp templates, API/CSV automation |

- Anchor the price to recovered cash, not software: "InvoiceFlow users get paid 12 days faster" — at ₹5L/month receivables that's worth thousands in working capital. ₹499 is trivially justified. (Upflow charges hundreds of dollars/month for the same logic in the US.)
- **Phase-2 monetization** (the Upflow playbook): once payment volume flows through your Razorpay links, negotiate revenue share / route volume; later, partner with a TReDS platform or NBFC for invoice financing referrals (you have the golden data: who pays whom, how late).
- **Server-side entitlements only.** Plan checks live in the API, never in React (see Prompt 8).

### Why the name & domain finally make sense

"InvoiceFlow" was a bad name for an accounting app (invoices don't flow in accounting). It's a *perfect* name for AR automation: the product literally makes invoices flow into cash. Landing page headline writes itself: *"Your invoices, flowing back as cash."*

---

## Part 4 — Infrastructure: the ₹0-to-start stack

### The decision: drop PostgREST entirely, keep one Express API, put Postgres on Neon

Your current stack (Netlify SPA → Netlify proxy → PostgREST on Render → Postgres, *plus* a separate Express auth-api that also proxies PostgREST) has **four moving parts and two sources of truth for authorization** (RLS in Postgres + checks in Express). That's why auth is broken — the Supabase `auth.uid()` RLS model was ported to an environment that doesn't have Supabase Auth.

**New architecture — three parts, one authorization layer:**

```
Netlify (React SPA, free)
   │  HTTPS + httpOnly cookies
   ▼
Render (single Express API, free tier → $7 starter when revenue exists)
   │  pg Pool, every query scoped by user/org ID in SQL
   ▼
Neon serverless Postgres (free tier)          Cloudflare R2 (files, free 10GB)
```

| Component | Provider | Free tier | When you pay |
|---|---|---|---|
| Postgres | **Neon** | 100 CU-hrs/mo compute, 0.5GB storage, scale-to-zero, no 7-day pause | ~$0.35/GB-mo storage + $0.106/CU-hr, **no monthly minimum** — purely usage-based |
| API | Render (keep existing service) | Free web service (sleeps) | $7/mo when you need always-on for webhooks/cron |
| Frontend | Netlify (already set up) | Generous | Effectively never at your scale |
| Files (PDFs) | Cloudflare R2 (already wired) | 10GB + no egress fees | Way past MVP |
| Email | **Resend** | 3,000 emails/mo | ₹ trivial |
| WhatsApp | Meta WhatsApp Cloud API | Free service conversations; utility templates ~₹0.12–0.35/msg | Per-message — charge it into Pro tier |
| Job queue | **pg-boss** (runs inside Postgres) | Free — no Redis, no BullMQ, delete `ioredis` | Never |

**Why Neon over Supabase / RDS / Cloud SQL:** it's plain Postgres (your `pg` Pool code works unchanged), it scales to zero so an app with no customers costs ~₹0, there's no $25/mo cliff like Supabase Pro, and no idle-project pausing like Supabase Free. AWS RDS / GCP Cloud SQL start at ~$15–30/mo for the smallest always-on instance — wrong shape for pre-revenue. If you ever outgrow Neon, it's `pg_dump | pg_restore` to anywhere, because it's just Postgres.

**Why kill PostgREST:** it forces you to express all authorization as RLS with a JWT claim convention you no longer have (no `auth.uid()`), it exposed your `profiles.password_hash` risk, it needs a Docker service + proxy + CORS shims, and every one of your recent commits (`fix: use Netlify proxy redirect for PostgREST…`) is you fighting it. With ~15 REST endpoints in Express you get explicit, testable authorization (`WHERE org_id = $1`) and one deployment.

---

## Part 5 — Security & code flaw inventory

Every item below is verified in the current code, with location.

### Critical

1. **JWT secret has a hardcoded fallback.** `services/auth-api/src/index.ts:29` — `JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'`. If the env var is ever missing in prod, anyone can forge tokens for any user. Must fail-fast at boot instead.
2. **₹1 → free Premium exploit (confirmed chain).** `/api/generate-payment-link` (index.ts:274) takes `amount`, `saleOrderId` straight from the client body and uses `saleOrderId` as Razorpay `reference_id` (index.ts:315). The webhook (index.ts:453–459) then parses `reference_id` with `/^(pro|premium)-/` and the userId regex `/(?:pro|premium)-(.+)/`. **Attack:** authenticated free user calls generate-payment-link with `amount: 1, saleOrderId: "premium-<their-own-user-id>"`, pays ₹1 through the real Razorpay link, webhook fires `payment_link.paid`, and `user_plans` is upserted to `premium` for 30 days. Additionally, the amount heuristic (`amount === 99 → pro`, index.ts:458) upgrades users off *any* ₹99 invoice payment.
3. **Any authenticated user can delete any file.** `DELETE /storage/delete` (index.ts:255–268) takes `filePath` from the body with **no ownership check** — user A deletes user B's invoices/receipts by guessing/enumerating paths. Uploads are prefixed `${userId}/` (index.ts:230) but deletion never verifies the prefix.
4. **Password hashes live in the PostgREST-exposed `profiles` table.** Sign-in reads `password_hash` from `profiles` (index.ts:109), the same table served by PostgREST to browsers. One permissive grant/policy away from a mass credential leak. Credentials must live in a table the API alone can reach.
5. **No rate limiting anywhere.** `/auth/signin` allows unlimited bcrypt attempts (credential stuffing + CPU exhaustion — bcrypt cost 12 per guess is also a DoS lever). No `express-rate-limit`, no lockout, no captcha.
6. **Password reset and magic link are fake.** index.ts:197–215 log the email and return `{ok:true}`. Users who forget passwords are permanently locked out while the UI tells them "check your email." This is silent data loss of accounts.

### High

7. **JWT in `localStorage`, 7-day lifetime, no refresh, no revocation.** `src/hooks/useAuth.tsx` + `src/lib/supabase.ts:83`. Any XSS = 7-day account takeover with no server-side kill switch. Move to short-lived access token + httpOnly refresh cookie with rotation.
8. **Admin is client-side only.** `role: 'authenticated'` is stamped on every JWT (index.ts:122); `profiles.is_admin` exists but no API route ever checks it. All `Admin*.tsx` pages/gates are DevTools-bypassable. (Same story for plan gates: `PlanGate`, `PremiumGuard`, `RequirePlan` are cosmetic.)
9. **CORS falls back to `*`** (index.ts:13) when `CORS_ORIGIN` is unset.
10. **AI API keys shipped to the browser.** `.env.template` has `VITE_GROQ_API_KEY` / `VITE_OPENAI_API_KEY` / `VITE_GEMINI_API_KEY` — anything `VITE_*` is embedded in the public JS bundle. Anyone can extract and burn your quota. All AI calls must go through the server route only.
11. **`/api/ai-assistant` has no quota enforcement** (index.ts:584) — "3 AI queries free" is a client-side fiction; the endpoint is unlimited to any authenticated user.

### Medium

12. **PostgREST config template**: `jwt-secret = "change-me"`, `cors-origins = "*"` (`scripts/postgrest/postgrest.conf`). Moot once PostgREST is deleted.
13. **Weak password policy**: zod `min(6)`, no max (bcrypt silently truncates at 72 bytes; unbounded input also burns CPU).
14. **Email enumeration**: signup returns 409 "account already exists" (index.ts:159). Acceptable UX tradeoff, but pair it with rate limiting.
15. **Personal UPI ID hardcoded as default**: `process.env.UPI_ID || 'joshuavaz55@okicici'` (index.ts:303) — your personal VPA in a repo, and payments silently route to it if env is missing.
16. **No security headers on the API** (helmet is a dependency of the *frontend* package, unused in auth-api).
17. **Webhook lookup by `notes` column** (index.ts:424) — payment matching via free-text field; collisions mis-attribute payments.

### Business-logic / hygiene

18. **60+ stale markdown files in repo root** (Supabase-era guides, Upwork job posts, fix logs) — noise that confuses every AI tool you point at the repo, including Cursor.
19. **Dead dependencies**: `bullmq`, `ioredis` (no Redis anywhere), `dodopayments`, `@emailjs/browser`, `tesseract.js`+OCR pipeline, `@anthropic-ai/sdk@0.12` (ancient), duplicated API clients (`src/lib/api.ts`, `apiFetch.ts`, `pgrst.ts`, `supabase.ts` all doing overlapping things).
20. **`src/integrations/supabase/types.ts` + compat shim** (`src/lib/supabase.ts` fake-auth monkey-patching) — an entire fake Supabase client maintained just to avoid refactoring call sites. This is the single biggest source of future bugs.

---

## Part 6 — Cursor prompts (execute in order)

Rules for using these:
- Run **one prompt per Cursor session/composer task**, in order. Each ends with acceptance criteria — make Cursor verify them before you move on.
- Commit after every prompt so you can bisect.
- Prompts assume the stack decision from Part 4 (Express + Neon + R2 + Resend + pg-boss).

---

### Prompt 0 — Scorched-earth cleanup

```
You are working in an existing repo (React/Vite/TS frontend in src/, Express API in
services/auth-api). We are pivoting the product to accounts-receivable collections
automation. Do a cleanup pass ONLY — no new features.

1. Delete all markdown files in the repo root EXCEPT README.md and
   PIVOT_PLAN_INVOICEFLOW.md. Delete: every *_GUIDE.md, *_SUMMARY.md, *_CHECKLIST.md,
   UPWORK_*.md, LOVABLE_*.md, EDGE_FUNCTION_*.md, all SQL files in the root
   (schema-for-new-project.sql, SQL_*.sql, test_*.sql, fix_*.sql,
   refresh_analytics_data.sql), eng.traineddata, and walkthrough.md.
2. Delete these feature areas entirely (pages, components, hooks, routes in App.tsx):
   EMI manager, Savings goals, Inventory + InventoryLedger, GSTR filing
   (OneClickGSTRFiling, GSTRFiling page), E-invoice (EInvoiceButton,
   BulkEInvoiceProcessor, EInvoiceSettings, useAutoSyncEInvoice), OCR
   (InvoiceOCRUploader, OCRInvoiceWorkbench, ReceiptUpload, tesseract), AI coach
   page, Admin CMS / AdminLogs / AdminDbHealth / ComponentPlayground,
   SpendingInsights, Exports page, WhatsAppDashboard page (keep the WhatsApp send
   modal components), LiveActivityFeed, OnboardingTour, canvas-confetti usage.
3. Remove now-unused npm dependencies: bullmq, ioredis, dodopayments,
   @emailjs/browser, tesseract.js, @napi-rs/canvas, sharp, canvas-confetti,
   fuse.js, fastest-levenshtein, simple-statistics, @anthropic-ai/sdk,
   lovable-tagger (also remove from vite.config), pdfjs-dist if only used by OCR.
4. Fix package.json scripts: remove dev:postgrest*, seed:analytics, setup:ocr,
   test:components*, deploy:vercel*, ingest. Keep dev, build, lint, test, api:dev.
5. Update App.tsx routes so the app still compiles: keep routes for landing, auth,
   dashboard, invoices (Bills can be renamed later), customers/settings/pricing.
   Delete route entries for removed pages.
6. Do NOT touch: src/components/pdf, UniversalInvoiceForm, GSTInvoice,
   UPIPaymentModal, WhatsAppSendModal, payment-related hooks, services/auth-api.

Acceptance: `npm run build` succeeds; `npx tsc --noEmit` clean; grep finds no
imports of deleted modules; repo root has ≤ 12 files.
```

---

### Prompt 1 — New database schema on Neon (single source of truth)

```
Create the complete Postgres schema for an AR-collections product, in
db/schema.sql (new folder), plus db/apply.mjs that applies it via the pg driver
using DATABASE_URL. Target: Neon (plain Postgres 16). NO Supabase constructs:
no auth schema, no RLS (authorization happens in the API), no storage schema.

Tables (all with created_at/updated_at timestamptz default now(), updated_at via
trigger; use uuid PKs with gen_random_uuid()):

1. users: id, email citext UNIQUE NOT NULL, password_hash text NOT NULL,
   full_name text, email_verified_at timestamptz, created/updated. NOTE: this
   is a private credentials table.
2. organizations: id, name, gstin text, udyam_number text (MSME registration),
   upi_vpa text, address jsonb, logo_url text.
3. org_members: org_id FK, user_id FK, role text CHECK (role IN
   ('owner','admin','member')), UNIQUE(org_id, user_id).
4. refresh_tokens: id, user_id FK, token_hash text UNIQUE, expires_at,
   revoked_at, user_agent text, ip inet.
5. customers (the debtors): id, org_id FK, name NOT NULL, email, phone,
   whatsapp_phone, gstin, billing_address jsonb, notes,
   preferred_channel text CHECK IN ('email','whatsapp','both') DEFAULT 'both'.
6. invoices: id, org_id FK, customer_id FK, invoice_number text NOT NULL,
   UNIQUE(org_id, invoice_number), issue_date date NOT NULL, due_date date NOT
   NULL, amount numeric(14,2) CHECK (amount>=0), tax_amount numeric(14,2)
   DEFAULT 0, amount_paid numeric(14,2) DEFAULT 0,
   status text CHECK IN ('draft','sent','partially_paid','paid','written_off')
   DEFAULT 'draft', currency text DEFAULT 'INR', line_items jsonb,
   pdf_url text, public_token text UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
   is_msme_supplier boolean DEFAULT false, msme_agreement_exists boolean DEFAULT false.
7. dunning_sequences: id, org_id FK, name, is_default boolean, steps jsonb
   -- steps: [{offset_days:-3, channel:'email', template:'friendly_pre_due'},
   --         {offset_days:1, channel:'whatsapp', template:'firm_overdue'},
   --         {offset_days:7, channel:'both', template:'msme_43bh_notice'},
   --         {offset_days:15, channel:'both', template:'interest_demand'}]
8. invoice_sequences: invoice_id FK UNIQUE, sequence_id FK, paused boolean
   DEFAULT false, next_step_index int DEFAULT 0, next_run_at timestamptz.
9. reminders_log: id, invoice_id FK, org_id FK, channel text, template text,
   status text CHECK IN ('queued','sent','delivered','failed'),
   provider_message_id text, error text, sent_at timestamptz.
10. payment_links: id, org_id FK, invoice_id FK, gateway text CHECK IN
    ('upi','razorpay'), url text, provider_reference_id text,
    amount numeric(14,2), status text CHECK IN ('active','paid','expired')
    DEFAULT 'active', expires_at, paid_at.
11. payments: id, org_id FK, invoice_id FK, amount numeric(14,2),
    method text, provider_payment_id text UNIQUE, raw_webhook jsonb,
    received_at timestamptz DEFAULT now().
12. promises_to_pay: id, invoice_id FK, org_id FK, promised_date date,
    promised_amount numeric(14,2), note text, kept boolean.
13. activity_log: id, org_id FK, invoice_id FK, actor text, type text,
    payload jsonb. (timeline: created, reminder_sent, viewed_by_customer,
    promise_made, payment_received…)
14. subscriptions (OUR billing): id, org_id FK UNIQUE, plan text CHECK IN
    ('free','pro','business') DEFAULT 'free', status text CHECK IN
    ('active','past_due','canceled') DEFAULT 'active',
    razorpay_subscription_id text, current_period_end timestamptz.
15. webhook_events: id, provider text, event_id text UNIQUE, payload jsonb,
    processed_at timestamptz. (idempotency)

Indexes: invoices(org_id,status), invoices(org_id,due_date),
invoice_sequences(next_run_at) WHERE paused=false, customers(org_id),
payments(invoice_id), reminders_log(invoice_id), refresh_tokens(user_id).

Also enable extensions: citext, pgcrypto.

Acceptance: node db/apply.mjs against a fresh database runs idempotently
(IF NOT EXISTS everywhere), and a second run makes no changes.
```

---

### Prompt 2 — Rebuild the API service (kill PostgREST, one Express app)

```
Refactor services/auth-api into services/api — the ONLY backend. Stack: Express 4
+ TypeScript + pg Pool + zod. Delete the PostgREST proxy (/db route) and
scripts/postgrest/ entirely, and remove the Netlify /pgrst redirect from
netlify.toml / vercel.json if present.

Structure:
services/api/src/
  index.ts          (bootstrap only: env validation, middleware, route mounting)
  env.ts            (zod-validated process.env; THROW at boot if JWT_SECRET,
                     DATABASE_URL missing — no fallbacks, this fixes the
                     'dev-secret-change-me' hole)
  db.ts             (pg Pool singleton)
  middleware/auth.ts (requireAuth: verifies access JWT; attaches
                     {userId, orgId, role, plan} by joining org_members +
                     subscriptions; requireRole('admin'); requirePlan('pro'))
  middleware/rateLimit.ts (express-rate-limit: 5/min on signin, 3/hr signup
                     per IP, 100/min general)
  routes/auth.ts, routes/orgs.ts, routes/customers.ts, routes/invoices.ts,
  routes/sequences.ts, routes/payments.ts, routes/webhooks.ts, routes/public.ts,
  routes/storage.ts, routes/ai.ts
  lib/email.ts (Resend), lib/whatsapp.ts (Meta Cloud API), lib/razorpay.ts,
  lib/tokens.ts, lib/interest.ts (MSMED calculator)

Global middleware: helmet, cors with EXPLICIT origin allowlist from env
(comma-separated; throw at boot if unset in production, never '*'),
express.json({limit:'1mb'}) except raw body for /webhooks/razorpay, morgan.

CRITICAL authorization rule: every query on org-scoped tables includes
`WHERE org_id = $orgId` from the verified JWT — never from the request body.
Write a small helper `orgQuery(orgId)` if useful. There is NO RLS anymore;
the API is the security boundary.

Port over (with fixes) from the old index.ts:
- Storage sign-upload: keep, but key = `${orgId}/${uuid}-${safeName}`.
- Storage delete: REQUIRE filePath to start with `${orgId}/` else 403 —
  this fixes the any-user-deletes-any-file bug.
- AI assistant route: keep behind requirePlan('pro') + a per-org daily counter
  stored in Postgres (ai_usage table or a column), enforced SERVER-side.

Delete the old plan-activation-by-amount logic entirely (rewritten in Prompt 7).

Acceptance: `npm run build` in services/api passes; boot with missing
JWT_SECRET exits non-zero with a clear message; a request with org A's token
against org B's invoice id returns 404/403 (write a supertest for this).
```

---

### Prompt 3 — Auth done right

```
Implement production auth in services/api. Requirements:

1. Credentials live in the `users` table (never in any table the frontend can
   query). bcryptjs cost 12; zod password: min 10, max 72 chars.
2. POST /auth/signup {email, password, full_name, org_name}:
   - create user + organization + org_members(owner) + subscriptions(free)
     in ONE transaction
   - send verification email (Resend) with a 24h single-use token
     (store hash in a verification_tokens table — add to schema)
   - respond 201 with session (verified=false is allowed to use the app,
     but sending reminders requires verified email — enforce in middleware)
3. Sessions: access JWT 15 min expiry ({sub, org, role, plan, v: tokenVersion})
   + refresh token: 32 random bytes, sha256 hash stored in refresh_tokens,
   30-day expiry, delivered as httpOnly, Secure, SameSite=None cookie scoped
   to the API domain, path=/auth. POST /auth/refresh rotates it (revoke old,
   issue new — reuse of a revoked token revokes the whole family).
   POST /auth/logout revokes the token server-side.
4. Frontend gets the access token in the JSON response and keeps it IN MEMORY
   ONLY (React state) — remove every localStorage.setItem('invoiceflow_jwt')
   and 'invoiceflow_user'. On page load, call /auth/refresh to bootstrap.
5. POST /auth/forgot-password → real email via Resend with 1h single-use token;
   POST /auth/reset-password consumes it and revokes all refresh tokens.
   Response is identical whether or not the email exists.
6. Rate limits per Prompt 2. Signup keeps the 409 (fine), but behind 3/hr/IP.
7. Frontend: rewrite src/hooks/useAuth.tsx against these endpoints. DELETE
   src/lib/supabase.ts, src/lib/pgrst.ts, src/integrations/supabase/ entirely.
   Create src/lib/apiClient.ts: fetch wrapper that attaches the in-memory
   access token, and on 401 calls /auth/refresh once then retries. Migrate
   every call site that imported the supabase client to apiClient + typed
   endpoint functions (src/lib/endpoints/*.ts). This is a large mechanical
   refactor — do it fully, no compatibility shims left.

Acceptance: npx tsc --noEmit clean in both packages; grep -r "supabase" src/
returns nothing; grep -r "invoiceflow_jwt" returns nothing; refresh flow
works across a hard reload (supertest + a Playwright smoke test).
```

---

### Prompt 4 — Core AR domain: customers, invoices, public payment page

```
Build the core product endpoints + UI.

API (all org-scoped, per Prompt 2 rules):
- CRUD /customers (list has search + outstanding-balance aggregate)
- CRUD /invoices (create validates due_date >= issue_date; status transitions:
  draft→sent→partially_paid→paid; PATCH /invoices/:id/record-payment for
  offline payments — inserts into payments, updates amount_paid and status)
- GET /invoices?status=&aging=0-30|31-60|61-90|90+&customer_id=
- GET /dashboard/ar-summary: total outstanding, aging buckets, DSO
  (simple: sum(now - issue_date weighted by amount)/sum(amount) over unpaid),
  expected-this-week (promises + due dates), top 5 debtors.
- CSV import: POST /invoices/import (multer, parse with a small csv lib,
  zod-validate per row, return per-row errors; max 500 rows).

PUBLIC (no auth, mounted at /public):
- GET /public/invoice/:token → invoice JSON for the payment page (uses
  invoices.public_token; log a 'viewed_by_customer' activity_log row,
  throttled to once/hour/token).
- The page shows: org name/logo, invoice details, MSMED interest accrued
  (from lib/interest.ts: compound interest at 3x RBI bank rate — bank rate
  from env RBI_BANK_RATE, default 6.75 — from due_date to today, only when
  invoice.is_msme_supplier), Pay Now (payment link from Prompt 6), and
  'Promise a date' form → creates promises_to_pay + activity_log.

Frontend:
- Rewrite src/pages/Bills.tsx into src/pages/Invoices.tsx (list w/ aging filter
  chips + status badges), reuse UniversalInvoiceForm for create/edit but strip
  it down to the schema fields, keep the PDF button.
- New src/pages/Customers.tsx.
- Rewrite Dashboard.tsx around /dashboard/ar-summary: outstanding, aging bar,
  DSO, 'chase these 5 first' list.
- New public route /i/:token (no auth shell) rendering the payment page —
  mobile-first, this is what debtors see.

Acceptance: create customer → create invoice → open /i/:token in incognito
shows the invoice; record-payment moves status; dashboard aggregates update.
```

---

### Prompt 5 — Dunning engine (pg-boss) + WhatsApp/Email delivery

```
Implement automated reminder sequences.

1. Add pg-boss to services/api (it uses the same Neon DATABASE_URL — no Redis).
   Start it in index.ts. Jobs: 'send-reminder', 'advance-sequences' (cron every
   15 min).
2. Sequences: CRUD /sequences per schema. Seed every new org with the default
   4-step sequence from the schema comment (T-3 email friendly, T+1 whatsapp
   firm, T+7 both with Section 43B(h) notice, T+15 both with MSMED interest
   demand). Attaching: POST /invoices/:id/sequence {sequence_id} computes
   next_run_at from due_date + steps[0].offset_days.
3. 'advance-sequences' cron: SELECT invoice_sequences WHERE next_run_at <= now()
   AND paused=false, with FOR UPDATE SKIP LOCKED; for each, enqueue
   'send-reminder', then advance next_step_index/next_run_at or complete.
   Auto-pause when invoice status becomes paid/written_off (do this in the
   record-payment path too).
4. Templates: server-side (lib/templates/), Handlebars-lite string interpolation
   with variables {customer_name, org_name, invoice_number, amount_due,
   days_overdue, interest_accrued, payment_link_url, public_page_url}.
   Write the actual copy for all 4 steps in Hindi-friendly professional English;
   the 43B(h) step must state: buyer loses income-tax deduction under Section
   43B(h) for payments to registered MSMEs beyond 15/45 days, citing the
   invoice's due date. Keep the tone factual, not threatening.
5. lib/email.ts: Resend, from reminders@<env DOMAIN>, reply-to org owner email.
   lib/whatsapp.ts: Meta WhatsApp Cloud API (env WHATSAPP_TOKEN,
   WHATSAPP_PHONE_ID) using pre-approved TEMPLATE messages (utility category);
   include a sendWhatsAppTemplate(to, template, variables) helper and a
   graceful 'not configured' path that logs to reminders_log as failed with
   a clear error.
6. Every send writes reminders_log + activity_log. GET /invoices/:id/timeline
   merges activity for the UI.
7. Free-plan orgs: sequences UI visible but attach endpoint returns 402 with
   upgrade message (server-enforced). Sending also requires email_verified_at.
8. Frontend: sequence editor page (list steps, edit offsets/channels/templates
   with live preview), timeline component on the invoice detail drawer,
   pause/resume toggle.

Acceptance: with a seeded invoice due yesterday, running the cron enqueues and
'sends' (Resend test mode / logged WhatsApp) the T+1 step exactly once
(idempotent under concurrent workers), timeline shows it, and paying the
invoice pauses the rest of the sequence.
```

---

### Prompt 6 — Payment links & webhook, rebuilt securely

```
Rewrite payment collection (old generate-payment-link + razorpay-webhook had
critical flaws — do not copy their logic).

1. POST /invoices/:id/payment-link {gateway:'upi'|'razorpay'}:
   - SERVER derives amount = invoice.amount + tax - amount_paid (+ optional
     interest if org enables it). NEVER read amount from the request body.
   - reference_id = payment_links.id (our uuid), generated BEFORE calling
     Razorpay — never client-supplied strings.
   - UPI: build upi://pay URI from organizations.upi_vpa (env fallback REMOVED —
     if org has no VPA, 400 with setup instructions). QR generated client-side
     with a tiny qr lib, not api.qrserver.com (don't leak payment data to a
     third party).
2. POST /webhooks/razorpay:
   - raw-body HMAC verify (keep), then INSERT INTO webhook_events ON CONFLICT
     (event_id) DO NOTHING; if conflict, return 200 (idempotent).
   - Resolve strictly: payment_link entity id → payment_links.provider_reference_id,
     or reference_id → payment_links.id. NO amount-based logic, NO regex
     user-id extraction, NO notes-column matching.
   - On paid: transaction { insert payments, update payment_links status,
     update invoice amount_paid/status, pause sequence, activity_log }.
   - Always 200 after signature passes (log processing errors, don't make
     Razorpay retry forever); 400 only for bad signature.
3. SEPARATE webhook path for OUR SaaS billing: /webhooks/razorpay-subscription
   handling subscription.activated/charged/halted → update subscriptions table.
   Plan is read from subscriptions by the auth middleware (Prompt 2) — plans
   are NEVER granted from payment amounts.
4. Frontend: 'Get payment link' button on invoice row/detail → modal with UPI QR,
   link copy, and WhatsApp-share deep link (wa.me with prefilled message).

Acceptance: supertest webhook suite: duplicate event_id processed once;
tampered signature 400; paid event moves invoice to paid and pauses sequence;
a crafted reference_id matching another org's data does nothing.
```

---

### Prompt 7 — MSME/43B(h) toolkit (the wedge feature)

```
Build the compliance toolkit that differentiates us in India.

1. lib/interest.ts (from Prompt 4) hardened: MSMED Act interest = compound
   interest, monthly rests, at 3x RBI bank rate, from (due_date per agreement,
   capped: 45 days with written agreement else 15 days from acceptance) until
   payment date. Unit-test with known examples. Expose
   GET /invoices/:id/msme-interest.
2. Org settings: udyam_number field + 'I am a registered Micro/Small
   enterprise' toggle; per-invoice is_msme_supplier + msme_agreement_exists
   flags flow into due-date math and templates.
3. Demand letter generator: GET /invoices/:id/demand-letter.pdf —
   @react-pdf/renderer (reuse existing pdf pipeline server-side or generate
   client-side from a typed payload endpoint): formal letter citing MSMED Act
   2006 Sections 15-16, computed interest table by month, Section 43B(h)
   note, org letterhead. This is Business-plan only (requirePlan('business')).
4. 'MSME Samadhaan checklist' static page: steps + documents to file on the
   Samadhaan portal, with the invoice's computed figures pre-filled in a
   copyable summary block.
5. Dashboard card: 'Interest you're legally owed: ₹X across N overdue
   invoices' — the single most shareable number in the product.

Acceptance: interest unit tests pass against hand-computed values; demand
letter renders with real invoice data; free/pro orgs get 402 on the letter.
```

---

### Prompt 8 — SaaS billing & server-side entitlements

```
Monetize: Free / Pro ₹499/mo / Business ₹1,499/mo via Razorpay Subscriptions.

1. Plans config in one server file (limits: free={active_invoices:10,
   sequences:false, whatsapp:false}, pro={unlimited, sequences:true,
   whatsapp:true}, business=pro+{multi_user:true, demand_letters:true,
   custom_sequences:true}).
2. POST /billing/subscribe {plan} → creates Razorpay subscription, returns
   checkout params; webhook (Prompt 6.3) activates. GET /billing/portal-info
   for current plan, period end, invoice history.
3. Enforcement lives ONLY in middleware/limits: creating an 11th active
   invoice on free → 402 {code:'LIMIT_ACTIVE_INVOICES', upgrade:'pro'};
   sequence attach, whatsapp channel, member invite, demand letter each check
   their gate server-side. Delete the old client-side gates as authorities:
   PlanGate/PremiumGuard/RequirePlan may remain as UI hints only, rewritten to
   read plan from /auth/me response, never to be the enforcement.
4. Frontend: pricing page (3 tiers, annual toggle at 2 months free), in-app
   upgrade modal triggered by 402 responses (apiClient intercepts 402 and
   opens it with the returned code).
5. Grace handling: subscription past_due → banner + 7-day grace, then
   downgrade behavior = sequences pause (never delete data).

Acceptance: supertest — free org's 11th invoice → 402; after simulated
subscription.activated webhook, same call succeeds; DevTools cannot unlock
anything (verify by calling API directly with free-org token).
```

---

### Prompt 9 — Landing page & positioning rewrite

```
Rewrite the landing page (src/pages/LandingPage.tsx + landing components) for
the new positioning. Kill all references to inventory/GST-filing/EMI/expense
features.

- Hero: "Your invoices, flowing back as cash." Subhead: "InvoiceFlow chases
  your overdue invoices automatically — polite WhatsApp & email reminders,
  UPI payment links, and the MSME late-payment law on your side. Get paid
  12 days faster."
- Section 2: the 4-step sequence visualized (timeline graphic: T-3 friendly →
  T+1 firm → T+7 43B(h) notice → T+15 interest demand).
- Section 3: the debtor-side payment page screenshot with the interest meter.
- Section 4: 43B(h)/MSMED explainer — "The law says they must pay you in 45
  days. We make sure they know it." + interest calculator widget (client-side,
  same formula as lib/interest.ts) as a lead magnet — no login required,
  email-gate the PDF result.
- Pricing section: 3 tiers from Prompt 8.
- Remove fake trust badges / fake activity feeds if any remain
  (TrustBadges, LiveActivityFeed). No fabricated testimonials or user counts.
- SEO: title/meta/og for keywords: "payment reminder software india",
  "msme delayed payment interest calculator", "section 43b(h) notice",
  "invoice follow up whatsapp".

Acceptance: lighthouse perf > 85 mobile; build passes; no removed-feature
references anywhere in src/ (grep for 'EMI', 'savings', 'inventory').
```

---

### Prompt 10 — Deployment & env hardening

```
Finalize deployment: Netlify (SPA) + Render (services/api) + Neon + R2 + Resend.

1. services/api: single-stage Dockerfile (node:22-slim, npm ci, tsc build,
   node dist/index.js) or Render's native Node runtime — remove the old
   'commit pre-compiled dist/' hack and delete dist/ from git + add to
   .gitignore.
2. env.ts must document and validate ALL vars: DATABASE_URL, JWT_SECRET
   (min 32 chars), CORS_ORIGINS, COOKIE_DOMAIN, RESEND_API_KEY, DOMAIN,
   RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET, R2_* , WHATSAPP_TOKEN?,
   WHATSAPP_PHONE_ID?, RBI_BANK_RATE, NODE_ENV. Generate .env.example.
   Remove every VITE_*_API_KEY (AI keys must not exist client-side).
3. netlify.toml: SPA fallback redirect only; DELETE the /pgrst proxy redirect.
   Frontend env: VITE_API_BASE only.
4. Add GitHub Action: on PR → install, tsc --noEmit both packages, vitest,
   eslint; on main → trigger Render deploy hook.
5. Health/ops: /health returns {ok, db: SELECT 1 latency, boss: pg-boss
   started}; morgan JSON logs; a scheduled UptimeRobot-compatible endpoint note
   in README.
6. Rewrite README.md: what InvoiceFlow is now, architecture diagram (ascii),
   local dev (npm run dev:full with Neon branch), deploy steps, env table.

Acceptance: fresh clone + .env.example filled → npm run dev:full works
end-to-end locally against a Neon branch; production deploy documented in
README in <15 steps.
```

---

## Execution order & rough effort

| Phase | Prompts | Outcome |
|---|---|---|
| Week 1 | 0, 1, 2 | Clean repo, real schema on Neon, one secure API |
| Week 2 | 3, 4 | Real auth, core invoices + public payment page (demoable) |
| Week 3 | 5, 6 | Automated dunning + payments — **the actual product** |
| Week 4 | 7, 8, 9, 10 | MSME wedge, billing, landing page, ship |

Total infra cost until you have paying customers: **≈ ₹0/month** (Neon free + Render free + Netlify free + R2 free + Resend free). First fixed cost is Render's $7/mo when you need the API always-on for webhooks — turn that on when the first Pro customer pays ₹499.
