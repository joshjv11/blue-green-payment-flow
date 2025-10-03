/**
 * Reminders Tests
 * Verifies reminder creation and user isolation
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const testEmail = `test-reminders-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let testUserId: string;
let testBillId: string;
let testReminderId: string;

describe('Reminders Tests', () => {
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

    // Create a bill first
    const { data: billData } = await client
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Test Bill for Reminders',
        amount: 50.00,
        due_date: '2025-12-31',
        category: 'utilities',
      })
      .select()
      .single();

    testBillId = billData!.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testReminderId) {
      await adminClient.from('reminders').delete().eq('id', testReminderId);
    }
    if (testBillId) {
      await adminClient.from('bills').delete().eq('id', testBillId);
    }
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
      await adminClient.from('profiles').delete().eq('id', testUserId);
    }
  });

  it('should create a reminder for the bill', async () => {
    const { data, error } = await client
      .from('reminders')
      .insert({
        user_id: testUserId,
        bill_id: testBillId,
        reminder_date: '2025-12-30',
        reminder_type: 'email',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.bill_id).toBe(testBillId);
    testReminderId = data.id;
  });

  it('should retrieve only user own reminders', async () => {
    const { data, error } = await client
      .from('reminders')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    // All returned reminders should belong to this user
    data!.forEach(reminder => {
      expect(reminder.user_id).toBe(testUserId);
    });
  });

  it('should cascade delete reminders when bill is deleted', async () => {
    // Create a temp bill and reminder
    const { data: tempBill } = await client
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Temp Bill',
        amount: 10.00,
        due_date: '2025-12-31',
        category: 'utilities',
      })
      .select()
      .single();

    const { data: tempReminder } = await client
      .from('reminders')
      .insert({
        user_id: testUserId,
        bill_id: tempBill!.id,
        reminder_date: '2025-12-30',
      })
      .select()
      .single();

    // Delete the bill
    await client.from('bills').delete().eq('id', tempBill!.id);

    // Try to fetch the reminder
    const { data, error } = await client
      .from('reminders')
      .select('*')
      .eq('id', tempReminder!.id);

    expect(data).toEqual([]);
  });
});
