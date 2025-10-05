/**
 * Smoke Tests for Reminder System
 * Tests the end-to-end flow of bill reminders after FK fixes
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const testEmail = `test-reminder-smoke-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let testUserId: string;
let testBillId: string;

describe('Reminder System Smoke Tests', () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  beforeAll(async () => {
    // Create test user
    const { data } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    testUserId = data.user!.id;

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Sign in
    await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    // Ensure profile exists with email notifications enabled
    await adminClient
      .from('profiles')
      .upsert({
        id: testUserId,
        email: testEmail,
        email_notifications_enabled: true,
      });

    // Create a test bill
    const { data: billData } = await client
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Smoke Test Bill',
        amount: 100.00,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        category: 'utilities',
        status: 'unpaid',
      })
      .select()
      .single();

    testBillId = billData!.id;
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

  it('should schedule a reminder successfully with FK in place', async () => {
    // Call schedule-individual-reminder edge function
    const { data, error } = await client.functions.invoke('schedule-individual-reminder', {
      body: {
        bill_id: testBillId,
        reminder_days_before: 2,
        priority: 'medium',
      },
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.success).toBe(true);
    expect(data.reminder).toBeTruthy();
    expect(data.reminder.bill_id).toBe(testBillId);
  });

  it('should return structured 200 response for bill not found', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await client.functions.invoke('schedule-individual-reminder', {
      body: {
        bill_id: fakeId,
        reminder_days_before: 1,
      },
    });

    // Should get a response (not throw)
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.reason).toBe('BILL_NOT_FOUND');
  });

  it('should return structured 200 response when email notifications disabled', async () => {
    // Disable email notifications for user
    await adminClient
      .from('profiles')
      .update({ email_notifications_enabled: false })
      .eq('id', testUserId);

    // Create another bill
    const { data: disabledBill } = await client
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Disabled Notifications Test',
        amount: 50.00,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'utilities',
        status: 'unpaid',
      })
      .select()
      .single();

    const { data, error } = await client.functions.invoke('schedule-individual-reminder', {
      body: {
        bill_id: disabledBill!.id,
        reminder_days_before: 1,
      },
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.reason).toBe('EMAIL_DISABLED_OR_MISSING');

    // Cleanup
    await adminClient.from('bills').delete().eq('id', disabledBill!.id);

    // Re-enable for other tests
    await adminClient
      .from('profiles')
      .update({ email_notifications_enabled: true })
      .eq('id', testUserId);
  });

  it('should verify FK relationship exists between bills and profiles', async () => {
    // Query the bill with profile join to confirm FK works
    const { data, error } = await adminClient
      .from('bills')
      .select('*, profiles!bills_user_id_fkey(email, email_notifications_enabled)')
      .eq('id', testBillId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.profiles).toBeTruthy();
    expect(data.profiles.email).toBe(testEmail);
  });

  it('should handle duplicate reminder gracefully', async () => {
    // Try to schedule the same reminder again
    const { data: firstSchedule } = await client.functions.invoke('schedule-individual-reminder', {
      body: {
        bill_id: testBillId,
        reminder_days_before: 2,
        priority: 'medium',
      },
    });

    const { data: secondSchedule } = await client.functions.invoke('schedule-individual-reminder', {
      body: {
        bill_id: testBillId,
        reminder_days_before: 2,
        priority: 'medium',
      },
    });

    // Both should succeed but second should indicate reminder exists
    expect(secondSchedule.success).toBe(true);
    expect(secondSchedule.message).toContain('already scheduled');
  });
});
