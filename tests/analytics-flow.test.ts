import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase, supabaseAdmin } from './setup';

const TEST_USER = {
  email: `test-analytics-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

let userId: string;
const billIds: string[] = [];

describe('Analytics Dashboard (E2E)', () => {
  beforeAll(async () => {
    // Create test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signUpError) throw signUpError;
    userId = signUpData.user!.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign in
    await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    console.log('✅ Test user created and signed in:', userId);
  });

  afterAll(async () => {
    // Clean up bills
    for (const billId of billIds) {
      await supabaseAdmin.from('bills').delete().eq('id', billId);
    }

    // Clean up user
    if (userId) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    console.log('✅ Cleanup complete');
  });

  it('should show empty state when no bills exist', async () => {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(bills).toHaveLength(0);

    console.log('✅ Empty state verified');
  });

  it('should calculate analytics correctly with bills', async () => {
    // Create test bills with different statuses
    const testBills = [
      {
        user_id: userId,
        name: 'Paid Bill 1',
        amount: 1000,
        due_date: '2024-01-15',
        category: 'utilities',
        status: 'paid',
        recurring: false,
      },
      {
        user_id: userId,
        name: 'Paid Bill 2',
        amount: 500,
        due_date: '2024-01-20',
        category: 'rent',
        status: 'paid',
        recurring: false,
      },
      {
        user_id: userId,
        name: 'Unpaid Bill',
        amount: 300,
        due_date: '2024-02-01',
        category: 'utilities',
        status: 'unpaid',
        recurring: false,
      },
      {
        user_id: userId,
        name: 'Overdue Bill',
        amount: 200,
        due_date: '2023-12-15',
        category: 'utilities',
        status: 'overdue',
        recurring: false,
      },
    ];

    for (const bill of testBills) {
      const { data, error } = await supabase
        .from('bills')
        .insert([bill])
        .select()
        .single();

      expect(error).toBeNull();
      billIds.push(data.id);
    }

    // Fetch bills and calculate analytics
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(bills).toHaveLength(4);

    // Calculate totals
    const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const paidAmount = bills
      .filter(b => b.status === 'paid')
      .reduce((sum, bill) => sum + bill.amount, 0);
    const unpaidAmount = bills
      .filter(b => b.status !== 'paid')
      .reduce((sum, bill) => sum + bill.amount, 0);
    const overdueBills = bills.filter(b => b.status === 'overdue').length;

    expect(totalAmount).toBe(2000);
    expect(paidAmount).toBe(1500);
    expect(unpaidAmount).toBe(500);
    expect(overdueBills).toBe(1);

    console.log('✅ Analytics calculations verified');
    console.log('  - Total: ₹2000');
    console.log('  - Paid: ₹1500');
    console.log('  - Unpaid: ₹500');
    console.log('  - Overdue: 1 bill');
  });

  it('should group bills by category', async () => {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();

    // Group by category
    const categoryTotals = bills.reduce((acc: Record<string, number>, bill) => {
      acc[bill.category] = (acc[bill.category] || 0) + bill.amount;
      return acc;
    }, {});

    expect(categoryTotals.utilities).toBe(1500); // 1000 + 300 + 200
    expect(categoryTotals.rent).toBe(500);

    console.log('✅ Category grouping verified');
  });

  it('should calculate payment progress percentage', async () => {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();

    const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const paidAmount = bills
      .filter(b => b.status === 'paid')
      .reduce((sum, bill) => sum + bill.amount, 0);
    
    const paymentProgress = (paidAmount / totalAmount) * 100;

    expect(paymentProgress).toBe(75); // 1500 / 2000 * 100

    console.log('✅ Payment progress: 75%');
  });
});
