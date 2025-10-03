.PHONY: help db.setup admin verify smoke clean

# Load environment variables
-include .env
export

# NEW project connection
NEW_PROJECT_REF := qusloccwftavvcsttmnq
NEW_DB_URL := postgresql://postgres:$(SUPABASE_SERVICE_ROLE_KEY)@db.$(NEW_PROJECT_REF).supabase.co:5432/postgres

help:
	@echo "Supabase NEW Project Setup"
	@echo ""
	@echo "Usage:"
	@echo "  make db.setup         - Apply schema, RLS, functions, triggers to NEW project"
	@echo "  make admin EMAIL=...  - Promote user to admin by email"
	@echo "  make verify           - List all tables and row counts"
	@echo "  make smoke            - Run connectivity smoke tests"
	@echo "  make import           - Import data from CSV files (if available)"
	@echo "  make clean            - Clean temporary files"
	@echo ""
	@echo "Example workflow:"
	@echo "  1. Set env vars in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)"
	@echo "  2. make db.setup"
	@echo "  3. Sign up via your app"
	@echo "  4. make admin EMAIL=your-email@example.com"
	@echo "  5. make smoke && make verify"

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

# Verify database setup
verify:
	@echo "🔍 Verifying database setup..."
	@psql "$(NEW_DB_URL)" -c "\
		SELECT \
			schemaname, \
			tablename, \
			(SELECT count(*) FROM public.profiles) as profile_count, \
			(SELECT count(*) FROM public.bills) as bill_count, \
			(SELECT count(*) FROM public.reminders) as reminder_count \
		FROM pg_tables \
		WHERE schemaname = 'public' \
		LIMIT 1;"
	@echo ""
	@echo "📊 All public tables:"
	@psql "$(NEW_DB_URL)" -c "\
		SELECT \
			t.table_name, \
			(xpath('/row/count/text()', query_to_xml(format('select count(*) as count from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text::int AS row_count \
		FROM information_schema.tables t \
		WHERE t.table_schema = 'public' \
		AND t.table_type = 'BASE TABLE' \
		ORDER BY t.table_name;" 2>/dev/null || echo "Note: Advanced row counting requires superuser. Use Supabase dashboard for detailed stats."
	@echo "✅ Verification complete!"

# Run smoke tests
smoke:
	@echo "🧪 Running smoke tests..."
	@npm run supa:check

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
