import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      service: 'schedule-bill-reminders',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('⏰ Setting up enhanced bill reminder schedule for 9 AM IST...');

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Enable required extensions
    console.log('🔧 Enabling pg_cron and pg_net extensions...');
    
    await supabase.rpc('exec', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        CREATE EXTENSION IF NOT EXISTS pg_net;
      `
    });

    // Remove existing cron jobs to avoid duplicates
    console.log('🗑️ Removing existing bill reminder cron jobs...');
    
    await supabase.rpc('exec', {
      sql: `
        SELECT cron.unschedule('send-daily-bill-reminders') 
        WHERE EXISTS (
          SELECT 1 FROM cron.job WHERE jobname = 'send-daily-bill-reminders'
        );
        
        SELECT cron.unschedule('send-weekly-bill-summary')
        WHERE EXISTS (
          SELECT 1 FROM cron.job WHERE jobname = 'send-weekly-bill-summary'
        );
      `
    });

    // Schedule enhanced daily bill reminders at 9:00 AM IST (3:30 AM UTC)
    // IST is UTC+5:30, so 9:00 AM IST = 3:30 AM UTC
    console.log('📅 Scheduling enhanced daily bill reminders at 9:00 AM IST (3:30 AM UTC)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    await supabase.rpc('exec', {
      sql: `
        SELECT cron.schedule(
          'send-daily-bill-reminders-enhanced',
          '30 3 * * *', -- 3:30 AM UTC = 9:00 AM IST
          $$
          SELECT
            net.http_post(
                url:='${supabaseUrl}/functions/v1/send-bill-reminders-enhanced',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
                body:='{"scheduled": true, "ist_time": "09:00", "time": "' || now() || '"}'::jsonb
            ) as request_id;
          $$
        );
      `
    });

    // Schedule comprehensive test emails (optional, for admin testing)
    console.log('📧 Scheduling optional weekly comprehensive test...');
    
    await supabase.rpc('exec', {
      sql: `
        SELECT cron.schedule(
          'weekly-bill-system-test',
          '0 4 * * 0', -- 4:00 AM UTC every Sunday = 9:30 AM IST
          $$
          SELECT
            net.http_post(
                url:='${supabaseUrl}/functions/v1/send-comprehensive-test-email',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
                body:='{"email": "admin@test.com", "testType": "weekly_system_check", "time": "' || now() || '"}'::jsonb
            ) as request_id;
          $$
        );
      `
    });

    console.log('✅ Enhanced bill reminder scheduling completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enhanced bill reminder system scheduled successfully',
        schedule: {
          daily_reminders: {
            time_ist: '9:00 AM IST',
            time_utc: '3:30 AM UTC',
            cron: '30 3 * * *',
            function: 'send-bill-reminders-enhanced',
            job_name: 'send-daily-bill-reminders-enhanced'
          },
          weekly_test: {
            time_ist: '9:30 AM IST (Sundays)',
            time_utc: '4:00 AM UTC (Sundays)',
            cron: '0 4 * * 0',
            function: 'send-comprehensive-test-email',
            job_name: 'weekly-bill-system-test'
          }
        },
        setup_notes: [
          'Daily bill reminders will be sent at 9:00 AM IST',
          'Only users with email_notifications_enabled = true will receive emails',
          'Bills due today and tomorrow will be included',
          'Professional formatting with INR amounts and retry mechanisms',
          'All emails include beautiful HTML design and call-to-action buttons'
        ]
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Enhanced scheduling error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to schedule enhanced bill reminders',
        troubleshooting: [
          'Ensure SUPABASE_URL and SUPABASE_ANON_KEY are configured',
          'Check that pg_cron extension is available in your Supabase instance',
          'Verify service role key has sufficient permissions',
          'Make sure the target edge functions exist and are deployed'
        ],
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);