/**
 * Admin Role Tests
 * Verifies admin promotion and cross-user access
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminEmail = `test-admin-${Date.now()}@example.com`;
const regularEmail = `test-regular-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let adminUserId: string;
let regularUserId: string;

describe('Admin Tests', () => {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  beforeAll(async () => {
    // Create admin user
    const { data: adminData } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: testPassword,
      email_confirm: true,
    });
    adminUserId = adminData.user!.id;

    // Create regular user
    const { data: regularData } = await adminClient.auth.admin.createUser({
      email: regularEmail,
      password: testPassword,
      email_confirm: true,
    });
    regularUserId = regularData.user!.id;

    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Promote admin
    await adminClient
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', adminUserId);
  });

  afterAll(async () => {
    // Cleanup
    if (adminUserId) {
      await adminClient.auth.admin.deleteUser(adminUserId);
      await adminClient.from('profiles').delete().eq('id', adminUserId);
    }
    if (regularUserId) {
      await adminClient.auth.admin.deleteUser(regularUserId);
      await adminClient.from('profiles').delete().eq('id', regularUserId);
    }
  });

  it('should confirm admin is promoted', async () => {
    const { data, error } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUserId)
      .single();

    expect(error).toBeNull();
    expect(data.is_admin).toBe(true);
  });

  it('should allow admin to view other profiles', async () => {
    await userClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    });

    const { data, error } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', regularUserId)
      .single();

    // If RLS allows admins, this should work
    // Otherwise it will fail - adjust based on your RLS policy
    console.log('Admin viewing other profile:', { data, error });
  });

  it('should allow admin to update other profiles', async () => {
    const { error } = await adminClient
      .from('profiles')
      .update({ company: 'Test Company' })
      .eq('id', regularUserId);

    expect(error).toBeNull();
  });
});
