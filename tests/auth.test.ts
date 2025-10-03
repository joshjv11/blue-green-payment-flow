/**
 * Auth + Profile Auto-Creation Tests
 * Verifies user signup, profile creation trigger, and basic RLS
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const testEmail = `test-auth-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let testUserId: string;

describe('Auth & Profile Tests', () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  afterAll(async () => {
    // Cleanup: delete test user
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
      await adminClient.from('profiles').delete().eq('id', testUserId);
    }
  });

  it('should sign up a new user', async () => {
    const { data, error } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    testUserId = data.user!.id;
  });

  it('should auto-create profile via trigger', async () => {
    // Wait a bit for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.email).toBe(testEmail);
  });

  it('should allow user to read their own profile', async () => {
    await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('should allow user to update their own profile', async () => {
    const { error } = await client
      .from('profiles')
      .update({ full_name: 'Test User' })
      .eq('id', testUserId);

    expect(error).toBeNull();
  });

  it('should prevent user from reading other profiles', async () => {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .neq('id', testUserId)
      .limit(1);

    // Should either return empty or error depending on RLS
    expect(data).toEqual([]);
  });
});
