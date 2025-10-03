.PHONY: help schema.dump-old schema.push-new data.export data.import auth.pathA auth.pathB storage.sync verify report migrate clean

help:
	@echo "Supabase Migration Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make schema.dump-old    - Export schema from OLD project"
	@echo "  make schema.push-new    - Apply schema to NEW project"
	@echo "  make data.export        - Export data from OLD project"
	@echo "  make data.import        - Import data to NEW project"
	@echo "  make auth.pathA         - Auth migration: Easy re-login"
	@echo "  make auth.pathB         - Auth migration: Advanced UUID preservation"
	@echo "  make storage.sync       - Sync storage buckets and files"
	@echo "  make verify             - Run verification checks"
	@echo "  make report             - Generate migration report"
	@echo "  make migrate            - Run full migration (all steps)"
	@echo "  make clean              - Clean export files and logs"
	@echo ""

# Ensure required directories exist
init:
	@mkdir -p exports/data exports/auth exports/storage logs
	@echo "✓ Created output directories"

# Schema migration
schema.dump-old: init
	@echo "→ Dumping schema from OLD project..."
	@bash scripts/schema-dump.sh
	@echo "✓ Schema exported to exports/schema.sql"

schema.push-new: init
	@echo "→ Pushing schema to NEW project..."
	@bash scripts/schema-push.sh
	@echo "✓ Schema applied to NEW project"

schema.check-extensions:
	@echo "→ Checking extensions..."
	@bash scripts/check-extensions.sh

# Data migration
data.export: init
	@echo "→ Exporting data from OLD project..."
	@bash scripts/data-export.sh
	@echo "✓ Data exported to exports/data/"

data.import: init
	@echo "→ Importing data to NEW project..."
	@bash scripts/data-import.sh
	@echo "✓ Data imported to NEW project"

data.check-fks:
	@echo "→ Checking foreign key constraints..."
	@bash scripts/check-fks.sh

# Auth migration
auth.pathA: init
	@echo "→ Auth Path A: Building email-based user mapping..."
	@bash scripts/auth/path-a.sh
	@echo "✓ User mapping created, FKs will be remapped on import"

auth.pathB: init
	@echo "→ Auth Path B: Exporting and importing users with UUID preservation..."
	@npm run --prefix scripts/auth migrate-users
	@echo "✓ Users migrated, building mapping table..."
	@bash scripts/auth/path-b.sh

# Storage migration
storage.sync: init
	@echo "→ Syncing storage buckets and files..."
	@npm run --prefix scripts storage-sync
	@echo "✓ Storage synced to NEW project"

# Verification
verify: init
	@echo "→ Running verification checks..."
	@bash scripts/verify.sh
	@echo "✓ Verification complete, see logs/verify.log"

# Report generation
report: init
	@echo "→ Generating migration report..."
	@bash scripts/report.sh
	@echo "✓ Report generated: MIGRATION_REPORT.md"

# Full migration
migrate: schema.dump-old schema.push-new data.export auth.pathA data.import storage.sync verify report
	@echo ""
	@echo "========================================="
	@echo "✓ MIGRATION COMPLETE"
	@echo "========================================="
	@echo ""
	@echo "Next steps:"
	@echo "1. Review MIGRATION_REPORT.md"
	@echo "2. Update OAuth providers in NEW project"
	@echo "3. Update app .env with NEW credentials"
	@echo "4. Test application with NEW project"
	@echo ""

# Cleanup
clean:
	@echo "→ Cleaning export files and logs..."
	@rm -rf exports/* logs/*
	@echo "✓ Cleaned"
