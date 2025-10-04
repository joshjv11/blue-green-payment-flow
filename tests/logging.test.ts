import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: SupabaseClient;
let adminSupabase: SupabaseClient;
let testUserId: string;
let testEmail: string;

describe('Error Logging System Tests', () => {
  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    testEmail = `test-logging-${Date.now()}@example.com`;
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
    // Clean up test data
    if (testUserId) {
      await adminSupabase.from('app_logs').delete().eq('user_id', testUserId);
      await adminSupabase.from('profiles').delete().eq('id', testUserId);
      await adminSupabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should log an event via edge function', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/log-client-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        level: 'info',
        event: 'test_event',
        component: 'test_component',
        action: 'test_action',
        message: 'This is a test log',
        context: { test: true },
      }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.request_id).toBeDefined();

    // Wait for log to be inserted
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify log was inserted (using service key to bypass RLS)
    const { data: logs, error } = await adminSupabase
      .from('app_logs')
      .select('*')
      .eq('user_id', testUserId)
      .eq('event', 'test_event')
      .single();

    expect(error).toBeNull();
    expect(logs).toBeDefined();
    expect(logs?.level).toBe('info');
    expect(logs?.component).toBe('test_component');
  });

  it('should handle error logs with stack traces', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/log-client-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        level: 'error',
        event: 'test_error',
        error_name: 'TestError',
        error_message: 'Something went wrong',
        stack: 'Error: Something went wrong\n    at TestComponent',
        context: { userId: testUserId },
      }),
    });

    expect(response.status).toBe(200);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify error log
    const { data: errorLog } = await adminSupabase
      .from('app_logs')
      .select('*')
      .eq('user_id', testUserId)
      .eq('event', 'test_error')
      .single();

    expect(errorLog).toBeDefined();
    expect(errorLog?.level).toBe('error');
    expect(errorLog?.error_name).toBe('TestError');
    expect(errorLog?.stack).toContain('TestComponent');
  });

  it('should validate required fields', async () => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/log-client-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        level: 'info',
        // Missing 'event' field
      }),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('event');
  });
});
