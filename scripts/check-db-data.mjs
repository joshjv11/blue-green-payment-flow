import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbzfddgqfqjuvpjzvhfi.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkData() {
    console.log('🔍 Checking database data...\n');

    // Check profiles
    const { data: profiles, error: profilesError } = await adminSupabase
        .from('profiles')
        .select('*')
        .limit(5);

    console.log('📊 Profiles:', profiles?.length || 0, 'rows');
    if (profilesError) console.error('❌ Profiles error:', profilesError);
    if (profiles && profiles.length > 0) {
        console.log('Sample profile:', profiles[0]);
    }

    // Check user_plans
    const { data: plans, error: plansError } = await adminSupabase
        .from('user_plans')
        .select('*')
        .limit(5);

    console.log('\n📊 User Plans:', plans?.length || 0, 'rows');
    if (plansError) console.error('❌ Plans error:', plansError);
    if (plans && plans.length > 0) {
        console.log('Sample plan:', plans[0]);
    }

    // Check bills
    const { data: bills, error: billsError } = await adminSupabase
        .from('bills')
        .select('*')
        .limit(5);

    console.log('\n📊 Bills:', bills?.length || 0, 'rows');
    if (billsError) console.error('❌ Bills error:', billsError);
    if (bills && bills.length > 0) {
        console.log('Sample bill:', bills[0]);
    }

    // Check payment_transactions
    const { data: payments, error: paymentsError } = await adminSupabase
        .from('payment_transactions')
        .select('*')
        .limit(5);

    console.log('\n📊 Payment Transactions:', payments?.length || 0, 'rows');
    if (paymentsError) console.error('❌ Payments error:', paymentsError);
    if (payments && payments.length > 0) {
        console.log('Sample payment:', payments[0]);
    }

    // Check customers
    const { data: customers, error: customersError } = await adminSupabase
        .from('customers')
        .select('*')
        .limit(5);

    console.log('\n📊 Customers:', customers?.length || 0, 'rows');
    if (customersError) console.error('❌ Customers error:', customersError);
    if (customers && customers.length > 0) {
        console.log('Sample customer:', customers[0]);
    }
}

checkData().catch(console.error);
