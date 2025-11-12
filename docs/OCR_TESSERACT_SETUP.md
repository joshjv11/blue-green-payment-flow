# Tesseract OCR Setup

This guide explains how to run the self-hosted Tesseract pipeline that powers the Bills page OCR uploader.

## 1. Prerequisites

- **Node.js 20+** (matches the project’s toolchain)
- **pnpm / npm** (whichever you use for the repo)
- **Tesseract OCR engine**
  ```bash
  # macOS
  brew install tesseract

  # Ubuntu / Debian
  sudo apt-get update && sudo apt-get install -y tesseract-ocr
  ```
- **Redis** (BullMQ background queue fallback)
  ```bash
  # macOS
  brew install redis && brew services start redis

  # Docker alternative
  docker run -p 6379:6379 redis:7-alpine
  ```
- Supabase credentials (URL + anon key) and the service-role key stored in `.env.local` / `.env`.

## 2. Environment Variables

| File | Variable | Description |
|------|----------|-------------|
| `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Required for uploading receipts and inserting bills from the browser. |
| `.env.local` | `VITE_LOCAL_TESSERACT_URL` | Defaults to `http://127.0.0.1:4000/api/invoices/extract-from-upload`. Set to `false` to disable the uploader. |
| `src/server/.env` (or shell) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Used by the server to persist OCR results. |
| `src/server/.env` | `REDIS_URL` | Connection string for BullMQ (e.g. `redis://localhost:6379`). |
| `src/server/.env` | `OCR_TESSERACT_LANG` (optional) | Language pack for Tesseract, defaults to `eng`. |
| `src/server/.env` | `OCR_SYNC_TIMEOUT_MS` (optional) | Inline processing timeout before queue fallback (default `25000`). |

After editing `.env.local`, restart `npm run dev` to pick up changes.

## 3. Install & Start Services

```bash
# install project dependencies
npm install

# (Optional) build Tesseract language packs if you need additional locales
# sudo tesseract-langpack install fra # example

# start the local OCR API
npm run api:dev

# in another terminal, start Vite
npm run dev
```

The API listens on `http://127.0.0.1:4000` by default. The Bills page automatically posts invoices to that URL when `VITE_LOCAL_TESSERACT_URL` is available.

## 4. Smoke Test the OCR API

Use the helper script to verify the pipeline:

```bash
# make the script executable once
chmod +x scripts/smoke-ocr-local.sh

# run a test extraction (arguments: <file> [userId] [workspaceId])
scripts/smoke-ocr-local.sh ./fixtures/sample-invoice.pdf \
  11111111-1111-1111-1111-111111111111
```

The script sends the invoice to the local endpoint and prints the JSON response. A `202` response means the request timed out inline and was queued; otherwise you should see a `success: true` body with structured fields.

## 5. Bills Page Flow

1. User uploads a PDF/PNG/JPEG from the Bills page.
2. The browser posts the binary to the local OCR service.
3. The service preprocesses, runs Tesseract (multi-variant + rotations), logs results, and writes the record to Supabase.
4. The UI uploads the original file to Supabase Storage, inserts a new `bill`, and refreshes the list.

If you want to temporarily disable the feature, set `VITE_LOCAL_TESSERACT_URL=false` and restart the dev server; the uploader will display a configuration message instead of the form.


