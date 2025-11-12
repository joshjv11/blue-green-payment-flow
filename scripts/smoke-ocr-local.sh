#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <invoice-file> [userId] [workspaceId]" >&2
  exit 1
fi

FILE_PATH=$1
USER_ID=${2:-11111111-1111-1111-1111-111111111111}
WORKSPACE_ID=${3:-$USER_ID}
ENDPOINT=${VITE_LOCAL_TESSERACT_URL:-http://127.0.0.1:4000/api/invoices/extract-from-upload}

if [[ ! -f "$FILE_PATH" ]]; then
  echo "File not found: $FILE_PATH" >&2
  exit 1
fi

echo "Sending $FILE_PATH to $ENDPOINT"
echo "User ID: $USER_ID"
echo "Workspace ID: $WORKSPACE_ID"
echo

curl -sS -X POST "$ENDPOINT" \
  -F "file=@${FILE_PATH}" \
  -F "userId=${USER_ID}" \
  -F "workspaceId=${WORKSPACE_ID}" \
  -F "sync=true" \
  | jq .


