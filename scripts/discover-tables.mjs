import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc4OTQxNCwiZXhwIjoyMDc0MzY1NDE0fQ.sabLfnzwaJxxhzvmy0k0U4rtOKeFvKKJGRScnx64y0M';

const supabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);

async function listTables() {
    // We can't list tables directly via API easily without pg_meta, 
    // but we can try to infer or use a known list, or try to access information_schema if exposed (usually not).
    // However, we can try to just list the ones we know and guess others?
    // Or better, let's try to fetch from a few common ones.

    // Actually, we can try to use the 'rpc' to call a system function if available, but unlikely.
    // Let's try to just use the list we have + the ones we found in the codebase.

    // Tables we know of:
    const candidates = [
        'profiles', 'bills', 'reminders', 'user_plans', 'payment_transactions',
        'customers', 'products', 'expenses', 'subscriptions',
        'invoices', 'receipts', 'audit_logs', 'feedback', 'notifications'
    ];

    console.log('Checking for existence of potential tables...');

    for (const table of candidates) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`FOUND: ${table} (Rows: ${count})`);
        } else {
            // console.log(`Not found: ${table} (${error.message})`);
        }
    }
}

listTables();
