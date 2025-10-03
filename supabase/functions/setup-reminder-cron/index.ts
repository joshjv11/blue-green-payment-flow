import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Setup Reminder Cron Job
 * Configures pg_cron to run process-due-reminders daily at 9:00 AM IST (3:30 AM UTC)
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⚙️ Setting up reminder cron job...');

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    // Enable required extensions
    console.log('🔧 Ensuring pg_cron and pg_net extensions are enabled...');
    await supabase.rpc('exec', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        CREATE EXTENSION IF NOT EXISTS pg_net;
      `
    });

    // Remove existing cron job if it exists
    console.log('🗑️ Removing existing reminder cron job...');
    await supabase.rpc('exec', {
      sql: `
        SELECT cron.unschedule('process-bill-reminders-daily')
        WHERE EXISTS (
          SELECT 1 FROM cron.job WHERE jobname = 'process-bill-reminders-daily'
        );
      `
    });

    // Schedule daily reminder processing at 9:00 AM IST (3:30 AM UTC)
    console.log('📅 Scheduling daily reminder cron at 9:00 AM IST (3:30 AM UTC)...');
    await supabase.rpc('exec', {
      sql: `
        SELECT cron.schedule(
          'process-bill-reminders-daily',
          '30 3 * * *', -- 3:30 AM UTC = 9:00 AM IST
          $$
          SELECT
            net.http_post(
                url:='${supabaseUrl}/functions/v1/process-due-reminders',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
                body:='{"scheduled": true, "time": "' || now() || '"}'::jsonb
            ) as request_id;
          $$
        );
      `
    });

    console.log('✅ Reminder cron job setup completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder cron job configured successfully',
        cron_job: {
          name: 'process-bill-reminders-daily',
          schedule: '30 3 * * *',
          time_utc: '3:30 AM UTC',
          time_ist: '9:00 AM IST',
          function: 'process-due-reminders',
          description: 'Processes all pending bill reminders daily'
        },
        next_steps: [
          'Reminders will now be sent automatically every day at 9:00 AM IST',
          'Test manually by calling /functions/v1/process-due-reminders',
          'View logs in Supabase Studio → Edge Functions → Logs'
        ]
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error setting up reminder cron:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to configure reminder cron job',
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
