import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc4OTQxNCwiZXhwIjoyMDc0MzY1NDE0fQ.sabLfnzwaJxxhzvmy0k0U4rtOKeFvKKJGRScnx64y0M';

const NEW_SUPABASE_URL = 'https://fbzfddgqfqjuvpjzvhfi.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function migrateUsers() {
    console.log('Fetching old users...');

    let allUsers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data: { users }, error } = await oldSupabase.auth.admin.listUsers({ page: page, perPage: 1000 });
        if (error) {
            console.error('Error fetching users:', error);
            break;
        }
        if (users.length === 0) {
            hasMore = false;
        } else {
            allUsers = [...allUsers, ...users];
            page++;
        }
    }

    console.log(`Found ${allUsers.length} users.`);

    for (const user of allUsers) {
        const { email, user_metadata } = user;
        if (!email) continue;

        console.log(`Migrating ${email}...`);

        // Try to create user
        const { data, error } = await newSupabase.auth.admin.createUser({
            email,
            password: 'TemporaryPassword123!',
            email_confirm: true,
            user_metadata
        });

        if (error) {
            console.log(`  Error (might already exist): ${error.message}`);
        } else {
            console.log(`  Created: ${data.user.id}`);
        }
    }
}

migrateUsers().catch(console.error);
