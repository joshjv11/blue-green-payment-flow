import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc4OTQxNCwiZXhwIjoyMDc0MzY1NDE0fQ.sabLfnzwaJxxhzvmy0k0U4rtOKeFvKKJGRScnx64y0M';

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);

async function debug() {
    console.log('Fetching 1 bill...');
    const { data: bills, error } = await oldSupabase.from('bills').select('*').limit(1);
    if (error) {
        console.error('Error fetching bills:', error);
        return;
    }
    console.log('Bill:', bills[0]);
}

debug();
