import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: SupabaseClient;
let adminSupabase: SupabaseClient;
let testUserId: string;
let testEmail: string;

describe('Bill Priority Constraint Tests', () => {
  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    testEmail = `test-priority-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPass123!',
    });

    if (authError) throw authError;
    testUserId = authData.user!.id;
    
    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up
    if (testUserId) {
      await adminSupabase.from('bill_reminders').delete().match({ user_id: testUserId });
      await adminSupabase.from('bills').delete().eq('user_id', testUserId);
      await adminSupabase.from('profiles').delete().eq('id', testUserId);
      await adminSupabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should create bill with "low" priority and auto-reminder', async () => {
    const { data: bill, error } = await supabase
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Low Priority Test Bill',
        amount: 100,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'utilities',
        priority: 'low',
        reminder_days_before: 1,
        auto_reminder_enabled: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(bill).toBeDefined();
    expect(bill?.priority).toBe('low');

    // Wait for trigger to create reminder
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify reminder was created with normalized priority
    const { data: reminder, error: reminderError } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('bill_id', bill!.id)
      .single();

    expect(reminderError).toBeNull();
    expect(reminder).toBeDefined();
    expect(reminder?.priority).toBe('low');
  });

  it('should create bill with "high" priority and auto-reminder', async () => {
    const { data: bill, error } = await supabase
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'High Priority Test Bill',
        amount: 500,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'utilities',
        priority: 'high',
        reminder_days_before: 1,
        auto_reminder_enabled: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(bill?.priority).toBe('high');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: reminder } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('bill_id', bill!.id)
      .single();

    expect(reminder).toBeDefined();
    expect(reminder?.priority).toBe('high');
  });

  it('should normalize priority to "medium" by default', async () => {
    const { data: bill } = await supabase
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Default Priority Test Bill',
        amount: 250,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'utilities',
        // No priority specified, should default to 'medium'
        auto_reminder_enabled: true,
      })
      .select()
      .single();

    expect(bill).toBeDefined();

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: reminder } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('bill_id', bill!.id)
      .single();

    expect(reminder).toBeDefined();
    expect(reminder?.priority).toBe('medium');
  });

  it('should handle reminder_days_before within valid range', async () => {
    const { data: bill } = await supabase
      .from('bills')
      .insert({
        user_id: testUserId,
        name: 'Custom Reminder Days Bill',
        amount: 300,
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'utilities',
        priority: 'medium',
        reminder_days_before: 7, // 1 week before
        auto_reminder_enabled: true,
      })
      .select()
      .single();

    expect(bill).toBeDefined();

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: reminder } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('bill_id', bill!.id)
      .single();

    expect(reminder).toBeDefined();
    expect(reminder?.reminder_days_before).toBe(7);
  });
});
