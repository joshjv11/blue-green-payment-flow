import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbzfddgqfqjuvpjzvhfi.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testAuthUsers() {
    console.log('🔍 Testing auth users fetch...\n');

    // Fetch auth users
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Auth error:', authError);
        return;
    }

    console.log('✅ Total auth users:', authData?.users?.length || 0);

    if (authData?.users && authData.users.length > 0) {
        console.log('\nFirst 3 auth users:');
        authData.users.slice(0, 3).forEach((user, i) => {
            console.log(`\n${i + 1}. User:`, {
                id: user.id,
                email: user.email,
                created_at: user.created_at
            });
        });
    }

    // Fetch profiles
    const { data: profiles, error: profilesError } = await adminSupabase
        .from('profiles')
        .select('*')
        .limit(3);

    if (profilesError) {
        console.error('❌ Profiles error:', profilesError);
        return;
    }

    console.log('\n✅ Total profiles:', profiles?.length || 0);

    if (profiles && profiles.length > 0) {
        console.log('\nFirst 3 profiles:');
        profiles.forEach((profile, i) => {
            console.log(`\n${i + 1}. Profile:`, {
                id: profile.id,
                full_name: profile.full_name,
                created_at: profile.created_at
            });
        });
    }

    // Test merge
    const authUsersMap = new Map(authData?.users?.map(u => [u.id, u]) || []);
    const merged = profiles?.map(profile => ({
        id: profile.id,
        email: authUsersMap.get(profile.id)?.email || null,
        full_name: profile.full_name,
        created_at: profile.created_at
    }));

    console.log('\n✅ Merged data (first 3):');
    merged?.forEach((user, i) => {
        console.log(`\n${i + 1}. Merged:`, user);
    });
}

testAuthUsers().catch(console.error);
