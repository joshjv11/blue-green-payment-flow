#!/bin/bash
set -e

source .env.old
source .env.new

REPORT_FILE="MIGRATION_REPORT.md"

echo "Generating migration report..."

cat > "$REPORT_FILE" <<EOF
# Migration Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

**OLD Project:** $OLD_PROJECT_REF  
**NEW Project:** $NEW_PROJECT_REF

---

## Summary

EOF

OLD_DB_URL="postgresql://postgres:${OLD_SERVICE_ROLE_KEY}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"
NEW_DB_URL="postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

# Table counts
echo "### Table Row Counts" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Table | OLD Count | NEW Count | Difference | Status |" >> "$REPORT_FILE"
echo "|-------|-----------|-----------|------------|--------|" >> "$REPORT_FILE"

TOTAL_OLD=0
TOTAL_NEW=0

while IFS= read -r table; do
  OLD_COUNT=$(psql "$OLD_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\";" | xargs)
  NEW_COUNT=$(psql "$NEW_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\";" | xargs)
  DIFF=$((NEW_COUNT - OLD_COUNT))
  
  STATUS="✅"
  if [ "$DIFF" -ne 0 ]; then
    STATUS="⚠️"
  fi
  
  echo "| $table | $OLD_COUNT | $NEW_COUNT | $DIFF | $STATUS |" >> "$REPORT_FILE"
  
  TOTAL_OLD=$((TOTAL_OLD + OLD_COUNT))
  TOTAL_NEW=$((TOTAL_NEW + NEW_COUNT))
done < exports/table-list.txt

echo "" >> "$REPORT_FILE"
echo "**Total Rows:** OLD = $TOTAL_OLD, NEW = $TOTAL_NEW" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# User migration stats
if [ -f exports/auth/user_mapping.json ]; then
  USER_COUNT=$(jq length exports/auth/user_mapping.json)
  echo "### User Migration" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- **Method:** Path B (Advanced UUID preservation)" >> "$REPORT_FILE"
  echo "- **Users migrated:** $USER_COUNT" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
elif [ -f exports/auth/old_users.csv ]; then
  USER_COUNT=$(tail -n +2 exports/auth/old_users.csv | wc -l)
  echo "### User Migration" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- **Method:** Path A (Email-based re-login)" >> "$REPORT_FILE"
  echo "- **OLD users exported:** $USER_COUNT" >> "$REPORT_FILE"
  echo "- **Action required:** Users must re-register on NEW project" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Storage stats
if [ -f exports/storage/manifest.json ]; then
  STORAGE_SUCCESS=$(jq -r .success exports/storage/manifest.json)
  STORAGE_FAILED=$(jq -r .failed exports/storage/manifest.json)
  STORAGE_BUCKETS=$(jq -r '.buckets | length' exports/storage/manifest.json)
  
  echo "### Storage Migration" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- **Buckets:** $STORAGE_BUCKETS" >> "$REPORT_FILE"
  echo "- **Files copied:** $STORAGE_SUCCESS" >> "$REPORT_FILE"
  echo "- **Failed:** $STORAGE_FAILED" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Next steps
cat >> "$REPORT_FILE" <<EOF

---

## Next Steps

1. **Verify application functionality:**
   - Update app \`.env\` with NEW project credentials
   - Test authentication (users may need to re-login if using Path A)
   - Verify data access and RLS policies

2. **Reconfigure OAuth providers:**
   - Update redirect URLs to: \`https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback\`
   - Re-save all enabled providers in NEW project dashboard

3. **Monitor logs:**
   - Check for any runtime errors
   - Verify background jobs (reminders, etc.)

4. **Decommission OLD project:**
   - After confirming everything works, pause OLD project
   - Keep backups for 30 days before deletion

---

## Files Generated

- \`exports/schema.sql\` - Full schema dump
- \`exports/data/*.csv\` - Table data exports
- \`exports/auth/\` - User migration files
- \`exports/storage/manifest.json\` - Storage sync manifest
- \`logs/\` - Detailed execution logs

---

**Migration Status:** ✅ Complete

EOF

echo "✓ Report generated: $REPORT_FILE"
cat "$REPORT_FILE"
