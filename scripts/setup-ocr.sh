#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🧩 Setting up Invoice OCR flow..."

echo "1️⃣  Installing npm dependencies"
npm install

if ! command -v supabase >/dev/null 2>&1; then
  echo "⚠️  Supabase CLI not found. Install it from https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "2️⃣  Pushing latest Supabase schema"
supabase db push --env-file supabase/.env

echo "3️⃣  Deploying extract-invoice-ocr edge function"
supabase functions deploy extract-invoice-ocr --no-verify-jwt --env-file supabase/.env

echo "4️⃣  Serving extract-invoice-ocr locally (port 9999)"
supabase functions serve extract-invoice-ocr --no-verify-jwt --env-file supabase/.env --port 9999 &
SERVE_PID=$!
sleep 2

echo "5️⃣  Starting frontend (CTRL+C to stop everything)"
npm run dev &
DEV_PID=$!

trap "echo '🛑 Stopping services'; kill $SERVE_PID $DEV_PID 2>/dev/null || true" INT TERM

wait $DEV_PID
kill $SERVE_PID 2>/dev/null || true


