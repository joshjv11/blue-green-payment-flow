#!/bin/bash
set -e

# Auth Path B: Advanced UUID preservation via Admin API
echo "Auth Path B: Advanced user migration with UUID preservation"
echo ""
echo "This requires Admin API access and may have rate limits."
echo "Press Enter to continue, or Ctrl+C to abort..."
read

source .env.old
source .env.new

# Run Node.js script to migrate users via Admin API
cd scripts/auth
npm install --silent
npm run migrate-users

echo ""
echo "✓ User migration via Admin API complete"
echo "  Check logs/auth-migration.log for details"
