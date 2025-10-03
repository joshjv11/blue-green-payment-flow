/**
 * Bills CRUD Tests
 * Verifies bill creation, updates, triggers, and RLS
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const testEmail = `test-bills-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let testUserId: string;
let testBillId: string;

describe('Bills Tests', () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  beforeAll(async () => {
    // Create test user
    const { data } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    testUserId = data.user!.id;

    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Sign in
    await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testBillId) {
      await adminClient.from('bills').delete().eq('id', testBillId);
    }
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
      await adminClient.from('profiles').delete().eq('id', testUserId);
    }
  });

  it('should create a new bill', async () => {
    const { data, error } = await client
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Test Bill',
        amount: 100.50,
        due_date: '2025-12-31',
        category: 'utilities',
        status: 'unpaid',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.name).toBe('Test Bill');
    testBillId = data.id;
  });

  it('should update a bill and trigger updated_at', async () => {
    const { data: original } = await client
      .from('bills')
      .select('updated_at')
      .eq('id', testBillId)
      .single();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data, error } = await client
      .from('bills')
      .update({ amount: 200.75 })
      .eq('id', testBillId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.amount).toBe('200.75');
    expect(new Date(data.updated_at).getTime()).toBeGreaterThan(
      new Date(original!.updated_at).getTime()
    );
  });

  it('should query bills by due_date', async () => {
    const { data, error } = await client
      .from('bills')
      .select('*')
      .gte('due_date', '2025-01-01')
      .eq('user_id', testUserId);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should only return user own bills', async () => {
    const { data, error } = await client
      .from('bills')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    // All returned bills should belong to this user
    data!.forEach(bill => {
      expect(bill.user_id).toBe(testUserId);
    });
  });
});
