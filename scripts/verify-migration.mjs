import { createClient } from '@supabase/supabase-js';

const NEW_SUPABASE_URL = 'https://fbzfddgqfqjuvpjzvhfi.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

async function verify() {
    const tables = ['profiles', 'bills', 'reminders', 'customers', 'products', 'expenses', 'user_plans'];

    console.log('Verifying row counts in NEW database...');

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ ${table}: Error - ${error.message}`);
        } else {
            console.log(`✅ ${table}: ${count} rows`);
        }
    }
}

verify();
