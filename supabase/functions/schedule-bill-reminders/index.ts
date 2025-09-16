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

  try {
    console.log('⏰ Setting up bill reminder cron job...');

    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Enable required extensions for cron jobs
    const { error: extensionError } = await supabase.rpc('sql', {
      query: `
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        CREATE EXTENSION IF NOT EXISTS pg_net;
      `
    });

    if (extensionError) {
      console.log('ℹ️ Extensions might already be enabled:', extensionError.message);
    }

    // Schedule the bill reminder cron job to run daily at 9 AM IST (3:30 AM UTC)
    const cronQuery = `
      SELECT cron.schedule(
        'send-daily-bill-reminders',
        '30 3 * * *',
        $$
        SELECT
          net.http_post(
            url:='${Deno.env.get('SUPABASE_URL')}/functions/v1/send-bill-reminders',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:='{"scheduled": true, "time": "' || now() || '"}'::jsonb
          ) as request_id;
        $$
      );
    `;

    const { data: cronResult, error: cronError } = await supabase.rpc('sql', {
      query: cronQuery
    });

    if (cronError) {
      console.error('❌ Failed to schedule cron job:', cronError);
      throw cronError;
    }

    console.log('✅ Bill reminder cron job scheduled successfully');

    // Also set up a weekly summary job (Sundays at 6 PM)
    const weeklyCronQuery = `
      SELECT cron.schedule(
        'send-weekly-bill-summary',
        '0 18 * * 0',
        $$
        SELECT
          net.http_post(
            url:='${Deno.env.get('SUPABASE_URL')}/functions/v1/send-bill-reminders',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:='{"scheduled": true, "type": "weekly_summary", "time": "' || now() || '"}'::jsonb
          ) as request_id;
        $$
      );
    `;

    const { data: weeklyCronResult, error: weeklyCronError } = await supabase.rpc('sql', {
      query: weeklyCronQuery
    });

    if (weeklyCronError) {
      console.log('⚠️ Weekly summary job not scheduled:', weeklyCronError.message);
    } else {
      console.log('✅ Weekly bill summary cron job scheduled');
    }

    return new Response(
      JSON.stringify({
        message: 'Bill reminder cron jobs scheduled successfully',
        dailyReminder: !!cronResult,
        weeklySummary: !!weeklyCronResult,
        scheduledAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Cron scheduling error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to schedule bill reminder cron jobs'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);