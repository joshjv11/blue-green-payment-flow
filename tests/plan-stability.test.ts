import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase, supabaseAdmin } from './setup';

describe('Plan Stability Tests', () => {
  let testUserId: string;
  const testEmail = `plan-test-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';

  beforeAll(async () => {
    // Create test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (authError) throw authError;
    testUserId = authData.user!.id;

    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await supabaseAdmin.from('user_plans').delete().eq('user_id', testUserId);
      await supabaseAdmin.from('profiles').delete().eq('id', testUserId);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
  });

  it('should create default free plan on signup', async () => {
    const { data: plan } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(plan).toBeDefined();
    expect(plan.plan).toBe('free');
    expect(plan.ai_queries_limit).toBe(3);
    expect(plan.ai_queries_used).toBe(0);
  });

  it('should not flip plan on concurrent reads', async () => {
    // Simulate multiple concurrent plan fetches
    const fetchPromises = Array(10).fill(null).map(() =>
      supabase
        .from('user_plans')
        .select('plan')
        .eq('user_id', testUserId)
        .single()
    );

    const results = await Promise.all(fetchPromises);

    // All results should be consistent
    const plans = results.map(r => r.data?.plan);
    expect(plans.every(p => p === 'free')).toBe(true);
  });

  it('should maintain plan state during RPC calls', async () => {
    const { data: initialPlan } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', testUserId)
      .single();

    // Make multiple RPC calls that read plan
    await supabase.rpc('is_system_admin', { user_id: testUserId });
    await supabase.rpc('is_system_admin', { user_id: testUserId });

    const { data: finalPlan } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', testUserId)
      .single();

    expect(finalPlan.plan).toBe(initialPlan.plan);
  });

  it('should track AI queries correctly without plan flip', async () => {
    const { data: initialPlan } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    // Track an AI query
    await supabase
      .from('user_plans')
      .update({ ai_queries_used: initialPlan.ai_queries_used + 1 })
      .eq('user_id', testUserId);

    const { data: updatedPlan } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(updatedPlan.plan).toBe(initialPlan.plan);
    expect(updatedPlan.ai_queries_used).toBe(initialPlan.ai_queries_used + 1);
  });

  it('should handle timeout gracefully', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100);

    try {
      await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', testUserId)
        .abortSignal(controller.signal as any);
    } catch (error: any) {
      // Should handle abort gracefully
      expect(error.message).toContain('aborted');
    } finally {
      clearTimeout(timeoutId);
    }
  });

  it('should respect RLS and prevent cross-user access', async () => {
    // Create second test user
    const testEmail2 = `plan-test2-${Date.now()}@test.com`;
    const { data: user2Auth } = await supabase.auth.signUp({
      email: testEmail2,
      password: testPassword,
    });

    const user2Id = user2Auth.user!.id;

    try {
      // Sign in as first user
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Try to read second user's plan
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user2Id)
        .maybeSingle();

      // Should return null due to RLS
      expect(data).toBeNull();

      // Try to update second user's plan
      const { error: updateError } = await supabase
        .from('user_plans')
        .update({ plan: 'pro' })
        .eq('user_id', user2Id);

      expect(updateError).toBeDefined();
    } finally {
      // Cleanup second user
      await supabaseAdmin.from('user_plans').delete().eq('user_id', user2Id);
      await supabaseAdmin.from('profiles').delete().eq('id', user2Id);
      await supabaseAdmin.auth.admin.deleteUser(user2Id);
    }
  });
});
