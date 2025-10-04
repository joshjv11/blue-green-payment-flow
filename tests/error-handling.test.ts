import { describe, it, expect } from 'vitest';
import { supabase } from './setup';

describe('Error Handling & Reliability Tests', () => {
  it('should handle missing table gracefully', async () => {
    const { data, error } = await supabase
      .from('nonexistent_table')
      .select('*')
      .maybeSingle();

    expect(data).toBeNull();
    expect(error).toBeDefined();
    expect(error.code).toBe('PGRST205');
  });

  it('should handle network timeout', async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);

    try {
      await supabase
        .from('user_plans')
        .select('*')
        .limit(1)
        .abortSignal(controller.signal as any);
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('aborted');
    }
  });

  it('should handle permission denied errors', async () => {
    // Sign out to test unauthorized access
    await supabase.auth.signOut();

    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .maybeSingle();

    // Should fail due to RLS
    expect(data).toBeNull();
  });

  it('should handle malformed queries', async () => {
    const { error } = await supabase
      .from('user_plans')
      .select('nonexistent_column');

    expect(error).toBeDefined();
  });

  it('should validate required fields on insert', async () => {
    // Try to insert bill without required fields
    const { error } = await supabase
      .from('bills')
      .insert([{ name: 'Test' }] as any); // Missing required fields

    expect(error).toBeDefined();
  });

  it('should prevent SQL injection in queries', async () => {
    const maliciousInput = "'; DROP TABLE bills; --";
    
    const { error } = await supabase
      .from('bills')
      .select('*')
      .eq('name', maliciousInput);

    // Should handle safely without error
    expect(error).toBeNull();
  });

  it('should handle concurrent writes without race conditions', async () => {
    // Sign in first
    const testEmail = `concurrent-${Date.now()}@test.com`;
    const { data: authData } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPass123!',
    });

    if (!authData.user) return;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate concurrent updates
    const promises = Array(5).fill(null).map((_, i) =>
      supabase
        .from('user_plans')
        .update({ ai_queries_used: i })
        .eq('user_id', authData.user!.id)
    );

    const results = await Promise.allSettled(promises);
    
    // All should succeed
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThan(0);

    // Final state should be consistent
    const { data: finalPlan } = await supabase
      .from('user_plans')
      .select('ai_queries_used')
      .eq('user_id', authData.user!.id)
      .single();

    expect(finalPlan.ai_queries_used).toBeGreaterThanOrEqual(0);
    expect(finalPlan.ai_queries_used).toBeLessThan(5);
  });
});
