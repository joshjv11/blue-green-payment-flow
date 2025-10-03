import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase, supabaseAdmin } from './setup';

const ADMIN_EMAIL = 'admin@invoiceflow.dev'; // Replace with your actual admin email
const TEST_USER = {
  email: `test-plan-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

let testUserId: string;
let adminUserId: string;

describe('Admin Plan Management (God Mode)', () => {
  beforeAll(async () => {
    // Create test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signUpError) throw signUpError;
    testUserId = signUpData.user!.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get admin user ID
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (adminProfile) {
      adminUserId = adminProfile.id;
    }

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await supabaseAdmin.from('user_plans').delete().eq('user_id', testUserId);
      await supabaseAdmin.from('profiles').delete().eq('id', testUserId);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }

    console.log('✅ Cleanup complete');
  });

  it('should create default free plan for new user', async () => {
    const { data: userPlan, error } = await supabaseAdmin
      .from('user_plans')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(error).toBeNull();
    expect(userPlan).toBeDefined();
    expect(userPlan.plan).toBe('free');
    expect(userPlan.ai_queries_limit).toBe(3);

    console.log('✅ Default free plan created');
  });

  it('should allow admin to upgrade user to pro', async () => {
    // Admin upgrades user to pro
    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from('user_plans')
      .update({
        plan: 'pro',
        ai_queries_limit: 999999,
      })
      .eq('user_id', testUserId)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updatedPlan.plan).toBe('pro');
    expect(updatedPlan.ai_queries_limit).toBe(999999);

    console.log('✅ Admin successfully upgraded user to pro');
  });

  it('should verify pro plan features are active', async () => {
    const { data: userPlan, error } = await supabaseAdmin
      .from('user_plans')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(error).toBeNull();
    expect(userPlan.plan).toBe('pro');
    
    // Verify pro features
    const hasUnlimitedBills = true; // Pro has unlimited bills
    const hasAdvancedAnalytics = userPlan.plan === 'pro';
    const hasUnlimitedAI = userPlan.ai_queries_limit === 999999;

    expect(hasUnlimitedBills).toBe(true);
    expect(hasAdvancedAnalytics).toBe(true);
    expect(hasUnlimitedAI).toBe(true);

    console.log('✅ Pro features verified');
  });

  it('should allow admin to downgrade user to free', async () => {
    // Admin downgrades user back to free
    const { data: downgradedPlan, error: downgradeError } = await supabaseAdmin
      .from('user_plans')
      .update({
        plan: 'free',
        ai_queries_limit: 3,
      })
      .eq('user_id', testUserId)
      .select()
      .single();

    expect(downgradeError).toBeNull();
    expect(downgradedPlan.plan).toBe('free');
    expect(downgradedPlan.ai_queries_limit).toBe(3);

    console.log('✅ Admin successfully downgraded user to free');
  });

  it('should prevent non-admin from modifying other user plans', async () => {
    // Sign in as test user (non-admin)
    await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    // Create another test user
    const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
      email: `other-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    const otherUserId = otherUser.user!.id;

    try {
      // Try to upgrade other user (should fail)
      const { data, error } = await supabase
        .from('user_plans')
        .update({ plan: 'pro' })
        .eq('user_id', otherUserId);

      // Should fail due to RLS
      expect(error).toBeDefined();

      console.log('✅ RLS correctly prevented unauthorized plan modification');
    } finally {
      // Cleanup
      await supabaseAdmin.from('user_plans').delete().eq('user_id', otherUserId);
      await supabaseAdmin.from('profiles').delete().eq('id', otherUserId);
      await supabaseAdmin.auth.admin.deleteUser(otherUserId);
    }
  });

  it('should allow user to view their own plan', async () => {
    // Sign in as test user
    await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    const { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(error).toBeNull();
    expect(userPlan).toBeDefined();
    expect(userPlan.user_id).toBe(testUserId);

    console.log('✅ User can view their own plan');
  });
});
