.PHONY: help db.setup admin verify smoke clean

# Load environment variables
-include .env
export

# NEW project connection
NEW_PROJECT_REF := qusloccwftavvcsttmnq
NEW_DB_URL := postgresql://postgres:$(SUPABASE_SERVICE_ROLE_KEY)@db.$(NEW_PROJECT_REF).supabase.co:5432/postgres

help:
	@echo "Supabase NEW Project Setup & Testing"
	@echo ""
	@echo "Usage:"
	@echo "  make db.setup         - Apply schema, RLS, functions, triggers to NEW project"
	@echo "  make admin EMAIL=...  - Promote user to admin by email"
	@echo "  make verify           - Run SQL verification + automated tests"
	@echo "  make smoke            - Quick smoke test (connectivity + basic flow)"
	@echo "  make test             - Run full automated test suite"
	@echo "  make test.watch       - Run tests in watch mode"
	@echo "  make import           - Import data from CSV files (if available)"
	@echo "  make clean            - Clean temporary files"
	@echo ""
	@echo "Example workflow:"
	@echo "  1. Set env vars in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)"
	@echo "  2. make db.setup"
	@echo "  3. Sign up via your app"
	@echo "  4. make admin EMAIL=your-email@example.com"
	@echo "  5. make verify          (runs SQL checks + full test suite)"
	@echo "  6. make smoke           (quick sanity check)"

# Apply schema to NEW project
db.setup:
	@echo "📦 Applying schema to NEW project..."
	@if [ -z "$(SUPABASE_SERVICE_ROLE_KEY)" ]; then \
		echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"; \
		exit 1; \
	fi
	@psql "$(NEW_DB_URL)" -f supabase/migrations/20250603000000_fresh_schema.sql
	@echo "✅ Schema applied successfully!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Update your app's .env with NEW credentials"
	@echo "  2. Sign up via your app"
	@echo "  3. Run: make admin EMAIL=your-email@example.com"

# Promote user to admin
admin:
	@if [ -z "$(EMAIL)" ]; then \
		echo "❌ Usage: make admin EMAIL=user@example.com"; \
		exit 1; \
	fi
	@echo "👑 Promoting $(EMAIL) to admin..."
	@psql "$(NEW_DB_URL)" -v email='$(EMAIL)' -f scripts/bootstrap_admin.sql
	@echo "✅ Admin promotion complete!"

# Verify database setup (SQL + Tests)
verify:
	@echo "🔍 Running comprehensive verification..."
	@echo ""
	@echo "📋 Part 1: SQL Health Check"
	@psql "$(NEW_DB_URL)" -f scripts/verify.sql
	@echo ""
	@echo "🧪 Part 2: Automated Test Suite"
	@npm test
	@echo ""
	@echo "✅ Verification complete!"

# Run smoke tests (quick sanity check)
smoke:
	@echo "🧪 Running smoke tests..."
	@npm run supa:check

# Run full test suite
test:
	@echo "🧪 Running full test suite..."
	@npm test

# Run tests in watch mode
test.watch:
	@echo "🧪 Running tests in watch mode..."
	@npm run test:watch

# Import data from CSV (if available)
import:
	@echo "📥 Importing data from CSV files..."
	@if [ ! -f import/profiles.csv ]; then \
		echo "⚠️  No CSV files found in import/ directory"; \
		echo "See import/README.md for instructions"; \
		exit 1; \
	fi
	@psql "$(NEW_DB_URL)" -f import/import.sql
	@echo "✅ Import complete!"

# Clean temporary files
clean:
	@echo "🧹 Cleaning temporary files..."
	@rm -f import/*.tmp
	@echo "✅ Clean complete!"
