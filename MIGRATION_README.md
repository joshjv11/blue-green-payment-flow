# InvoiceFlow Migration (Supabase -> Railway Postgres + PostgREST + Node API + R2)

This repository now includes scaffolding and assets to execute the recommended migration with minimal downtime.

## Components

- `scripts/schema-consolidated.sql` — minimal core schema (profiles, bills, reminders + policies/triggers)
- `data/templates/*.csv` — CSV headers to import via Supabase/Railway admin for quick data load
- `scripts/postgrest/postgrest.conf` — example PostgREST config
- `services/auth-api` — Node/Express service for JWT auth and storage signing
- `src/lib/api.ts` — frontend API wrapper (feature-toggle via `VITE_API_BASE`)

## Order of Operations

1. Provision Railway Postgres (prefer Singapore for India proximity).
2. Apply SQL:
   - Paste `scripts/schema-consolidated.sql` in your DB editor and run.
   - Apply Storage bucket policies in Supabase (if staying) or configure Cloudflare R2 (recommended).
3. PostgREST
   - Deploy with `postgrest.conf` (set `db-uri`, `jwt-secret`, `db-anon-role`).
   - Map `role-claim-key = ".role"`. Your JWT must contain `{ \"role\": \"authenticated\", \"sub\": \"<user_id>\" }`.
4. Node Auth/Storage API
   - `cd services/auth-api && npm i && npm run dev`
   - Required env:
     ```
     PORT=8787
     CORS_ORIGIN=https://your-frontend.com
     JWT_SECRET=super-secret
     DATABASE_URL=postgres://user:pass@host:5432/db
     R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
     R2_BUCKET=invoiceflow-prod
     R2_ACCESS_KEY_ID=xxx
     R2_SECRET_ACCESS_KEY=yyy
     ```
5. Frontend
   - Set env:
     ```
     VITE_API_BASE=https://your-auth-api.example.com
     VITE_PGRST_URL=https://your-postgrest.example.com
     ```
   - Start migrating calls from `src/lib/supabase.ts` to `src/lib/api.ts` + PostgREST endpoints.

## Testing Checklist

- Issue JWT via `/auth/signin` (temporary email/password) and store in `localStorage.jwt`.
- `GET /bills` via PostgREST with `Authorization: Bearer <jwt>` returns only user’s bills.
- Create bill via `POST /bills` (RLS check passes).
- Generate storage PUT URL via `/storage/sign-put` and upload a test file to R2.

## Notes

- This scaffolding is safe to keep alongside Supabase; you can feature-flag by env and gradually cut over.


