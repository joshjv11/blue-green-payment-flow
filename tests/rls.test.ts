/**
 * RLS Enforcement Tests
 * Verifies Row Level Security policies prevent unauthorized access
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const user1Email = `test-rls-user1-${Date.now()}@example.com`;
const user2Email = `test-rls-user2-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let user1Id: string;
let user2Id: string;
let user2BillId: string;

describe('RLS Tests', () => {
  const user1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const user2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  beforeAll(async () => {
    // Create two users
    const { data: user1Data } = await user1Client.auth.signUp({
      email: user1Email,
      password: testPassword,
    });
    user1Id = user1Data.user!.id;

    const { data: user2Data } = await user2Client.auth.signUp({
      email: user2Email,
      password: testPassword,
    });
    user2Id = user2Data.user!.id;

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Sign in user2 and create a bill
    await user2Client.auth.signInWithPassword({
      email: user2Email,
      password: testPassword,
    });

    const { data: billData } = await user2Client
      .from('bills')
      .insert({
        user_id: user2Id,
        name: 'User2 Private Bill',
        amount: 100.00,
        due_date: '2025-12-31',
        category: 'utilities',
      })
      .select()
      .single();

    user2BillId = billData!.id;
  });

  afterAll(async () => {
    // Cleanup
    if (user2BillId) {
      await adminClient.from('bills').delete().eq('id', user2BillId);
    }
    if (user1Id) {
      await adminClient.auth.admin.deleteUser(user1Id);
      await adminClient.from('profiles').delete().eq('id', user1Id);
    }
    if (user2Id) {
      await adminClient.auth.admin.deleteUser(user2Id);
      await adminClient.from('profiles').delete().eq('id', user2Id);
    }
  });

  it('should prevent user1 from reading user2 bills', async () => {
    await user1Client.auth.signInWithPassword({
      email: user1Email,
      password: testPassword,
    });

    const { data, error } = await user1Client
      .from('bills')
      .select('*')
      .eq('id', user2BillId);

    // Should return empty or error
    expect(data).toEqual([]);
  });

  it('should prevent user1 from updating user2 bills', async () => {
    const { error } = await user1Client
      .from('bills')
      .update({ amount: 999.99 })
      .eq('id', user2BillId);

    expect(error).toBeTruthy();
  });

  it('should prevent user1 from deleting user2 bills', async () => {
    const { error } = await user1Client
      .from('bills')
      .delete()
      .eq('id', user2BillId);

    expect(error).toBeTruthy();
  });

  it('should prevent inserting bill with wrong user_id', async () => {
    const { error } = await user1Client
      .from('bills')
      .insert({
        user_id: user2Id, // Trying to insert as user2
        name: 'Fake Bill',
        amount: 50.00,
        due_date: '2025-12-31',
        category: 'utilities',
      });

    expect(error).toBeTruthy();
    expect(error?.message).toContain('row-level security');
  });
});
