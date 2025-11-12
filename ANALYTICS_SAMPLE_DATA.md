## Analytics Sample Data Seeder

Use this helper to populate realistic revenue, inventory, and customer activity so the Advanced Analytics dashboard lights up with meaningful insights immediately.

### 1. Configure environment variables

Set the following variables in your shell or `.env` file before running the script:

```bash
export SUPABASE_URL="https://<your-project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export ANALYTICS_SEED_USER_ID="<uuid-from-auth.users>"
# Optional – defaults to analytics-demo@invoicesync.test
export ANALYTICS_SEED_EMAIL="founder@yourdomain.com"
```

> Tip: grab the UUID from the `auth.users` table for the workspace owner you want to demo with. The script upserts a matching row in `profiles`.

### 2. Run the seeder

```bash
npm run seed:analytics
```

The script will:

- Upsert five demo SKUs in `products`
- Insert six months of sales and purchase orders
- Populate `order_lines` for each sale with realistic quantities, taxes, and totals

All records align with the supplied `ANALYTICS_SEED_USER_ID`, so the KPI hooks can pick them up immediately.

### 3. Open the dashboard

Reload the Advanced Analytics dashboard. With the updated UI polish you’ll see animated highlights, timeframe toggles, and fully populated KPI cards driven by the seeded data.

