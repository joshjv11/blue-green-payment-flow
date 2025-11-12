# GST Feature Setup

Use this checklist to provision the required tables, seed demo data, and verify the GST workflows after a fresh environment setup.

## 1. Prerequisites
- Supabase CLI installed (`brew install supabase/tap/supabase` on macOS)
- Project linked via `supabase link --project-ref qusloccwftavvcsttmnq`
```bash
supabase link --project-ref qusloccwftavvcsttmnq --password <db_password>
```
- Service Role key available in `.env.local` for the frontend

## 2. Apply Database Migrations
```bash
cd /Users/joshuavaz/Documents/blue-green-payment-flow
supabase db push
```
This applies all migrations in `supabase/migrations` to the linked project.

## 3. Seed Demo Data (Optional but recommended for QA/Marketing)
```bash
supabase db remote commit --file docs/SEED_GST_DEMO.sql
```
Runs the idempotent seed script to populate:
- Demo premium user account
- GSTN credentials
- Recent GSTR-1/GSTR-3B filings
- ITC reconciliation rows
- GST mismatch alerts
- Sample payment transactions (if table exists)

## 4. Run Edge Functions (if testing locally)
```bash
supabase functions serve reconcile-itc send-whatsapp-broadcast auto-sync-einvoice-status --no-verify-jwt
```
Add/remove functions based on the flows you want to test. In production, these should already be deployed.

## 5. Start the App
```bash
npm run dev
```
Log in as the demo user (`demo-premium@invoiceflow.dev`) or your own account with the Pro/GST plan.

## 6. Smoke Test Checklist
- Navigate to `Bills` → ensure no runtime errors (OCR tiles are locked by design).
- Open `GST Dashboard` → filings, compliance score, mismatch alerts render with seeded data.
- Run `Generate GSTR-1`/`GSTR-3B` → success toast + new entry in history.
- Trigger `Auto Reconcile ITC` → toast confirmation; check logs for reconciliation function activity.
- Resolve a mismatch → row updates to resolved state.
- Verify Admin CMS → Passwords tab decrypts credential, User Behaviour tab shows events.

## 7. Resetting the Demo
Re-run the seed script whenever you need fresh data. The UPSERTs ensure repeated runs keep data consistent.
