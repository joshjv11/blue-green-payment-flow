import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase, supabaseAdmin } from './setup';

const SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxenpjdmtnZW9naGlyZnJmbHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQzNDUsImV4cCI6MjA3MzQyMDM0NX0.NiUzLQFPOwPMiTFKyxMS82hdrqWxE9JbLdIYo-zoJYo';

const TEST_USER = {
  email: `test-bills-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

let userId: string;
let billId: string;

describe('Add Bill Flow (E2E)', () => {
  beforeAll(async () => {
    // Create test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signUpError) throw signUpError;
    userId = signUpData.user!.id;

    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Test user created:', userId);
  });

  afterAll(async () => {
    // Clean up bill
    if (billId) {
      await supabaseAdmin.from('bills').delete().eq('id', billId);
    }

    // Clean up user
    if (userId) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    console.log('✅ Cleanup complete');
  });

  it('should create a bill and refresh dashboard', async () => {
    // Sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(signInError).toBeNull();

    // Get initial bill count
    const { data: initialBills, error: initialError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    expect(initialError).toBeNull();
    const initialCount = initialBills?.length || 0;

    // Create a new bill
    const newBill = {
      user_id: userId,
      name: 'Test Electricity Bill',
      amount: 1500,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      category: 'utilities',
      status: 'unpaid',
      recurring: true,
      auto_reminder_enabled: true,
      reminder_days_before: 1,
      notes: 'Test bill for E2E testing',
    };

    const { data: createdBill, error: createError } = await supabase
      .from('bills')
      .insert([newBill])
      .select()
      .single();

    expect(createError).toBeNull();
    expect(createdBill).toBeDefined();
    expect(createdBill.name).toBe(newBill.name);
    expect(createdBill.amount).toBe(newBill.amount);
    billId = createdBill.id;

    console.log('✅ Bill created successfully:', billId);

    // Verify bill count increased
    const { data: updatedBills, error: updatedError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    expect(updatedError).toBeNull();
    expect(updatedBills?.length).toBe(initialCount + 1);

    console.log('✅ Dashboard refreshed - bill count increased');
  });

  it('should respect RLS policies', async () => {
    // Try to access bill as different user (should fail)
    const { data: otherUserData, error: otherUserError } = await supabase.auth.signUp({
      email: `other-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    expect(otherUserError).toBeNull();
    const otherUserId = otherUserData.user!.id;

    try {
      // Try to fetch the bill created by first user
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      // Should return no data (RLS blocking access)
      expect(billError).toBeDefined();
      expect(billData).toBeNull();

      console.log('✅ RLS policy correctly blocked unauthorized access');
    } finally {
      // Cleanup other user
      await supabaseAdmin.from('profiles').delete().eq('id', otherUserId);
      await supabaseAdmin.auth.admin.deleteUser(otherUserId);
    }
  });

  it('should handle validation errors correctly', async () => {
    // Try to create bill with missing required fields
    const invalidBill = {
      user_id: userId,
      // Missing name, amount, due_date
      category: 'utilities',
      status: 'unpaid',
    };

    const { data, error } = await supabase
      .from('bills')
      .insert([invalidBill as any])
      .select();

    // Should fail due to NOT NULL constraints
    expect(error).toBeDefined();
    expect(error?.message).toContain('null');

    console.log('✅ Validation error handled correctly');
  });

  it('should handle update operations', async () => {
    // Update the bill status
    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update({ status: 'paid' })
      .eq('id', billId)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updatedBill.status).toBe('paid');
    expect(updatedBill.updated_at).not.toBe(updatedBill.created_at);

    console.log('✅ Bill updated successfully');
  });

  it('should handle delete operations', async () => {
    // Delete the bill
    const { error: deleteError } = await supabase
      .from('bills')
      .delete()
      .eq('id', billId);

    expect(deleteError).toBeNull();

    // Verify it's deleted
    const { data: deletedBill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .maybeSingle();

    expect(fetchError).toBeNull();
    expect(deletedBill).toBeNull();

    console.log('✅ Bill deleted successfully');
    billId = ''; // Clear billId so afterAll doesn't try to delete again
  });
});
