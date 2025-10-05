import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleReminderRequest {
  bill_id: string;
  reminder_days_before?: number;
  priority?: 'low' | 'medium' | 'high';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (
    req.method === 'GET' &&
    new URL(req.url).searchParams.get('health') === '1'
  ) {
    return new Response(
      JSON.stringify({ ok: true, ts: Date.now() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    console.log('📋 Starting individual bill reminder scheduling...');
    
    const { bill_id, reminder_days_before = 1, priority = 'medium' }: ScheduleReminderRequest = await req.json();
    
    if (!bill_id) {
      throw new Error('bill_id is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get bill details
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*, profiles!bills_user_id_fkey(email, full_name, email_notifications_enabled)')
      .eq('id', bill_id)
      .single();

    if (billError || !bill) {
      console.error('❌ Error fetching bill:', billError);
      throw new Error(`Bill not found: ${billError?.message}`);
    }

    // Check if user has email notifications enabled
    if (!bill.profiles?.email_notifications_enabled) {
      console.log('⚠️ User has email notifications disabled, skipping reminder scheduling');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reminder not scheduled - user has email notifications disabled',
          bill_id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Calculate reminder date (days before due date)
    const dueDate = new Date(bill.due_date);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminder_days_before);
    
    // Don't schedule reminders for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reminderDate < today) {
      console.log(`⚠️ Reminder date ${reminderDate.toISOString()} is in the past, skipping`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reminder not scheduled - date is in the past',
          bill_id,
          reminder_date: reminderDate.toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if reminder already exists
    const { data: existingReminder } = await supabase
      .from('bill_reminders')
      .select('id')
      .eq('bill_id', bill_id)
      .eq('reminder_date', reminderDate.toISOString().split('T')[0])
      .single();

    if (existingReminder) {
      console.log('⚠️ Reminder already exists for this bill and date');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reminder already scheduled',
          bill_id,
          reminder_id: existingReminder.id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Create bill reminder record
    const { data: reminder, error: reminderError } = await supabase
      .from('bill_reminders')
      .insert({
        bill_id,
        user_id: bill.user_id,
        reminder_date: reminderDate.toISOString().split('T')[0],
        reminder_days_before,
        priority,
        status: 'pending',
        delivery_status: 'pending'
      })
      .select()
      .single();

    if (reminderError || !reminder) {
      console.error('❌ Error creating reminder record:', reminderError);
      throw new Error(`Failed to create reminder: ${reminderError?.message}`);
    }

    console.log(`✅ Bill reminder scheduled successfully:`, {
      reminder_id: reminder.id,
      bill_id,
      bill_name: bill.name,
      user_email: bill.profiles?.email,
      reminder_date: reminderDate.toISOString().split('T')[0],
      due_date: bill.due_date,
      priority
    });

    // Calculate IST time for 9 AM reminder (3:30 AM UTC)
    const reminderDateTime = new Date(reminderDate);
    reminderDateTime.setUTCHours(3, 30, 0, 0); // 9:00 AM IST = 3:30 AM UTC

    // Create unique job name
    const jobName = `bill-reminder-${reminder.id}`;
    
    // Enable pg_cron if needed and schedule the job
    try {
      await supabase.rpc('exec', {
        sql: `
          CREATE EXTENSION IF NOT EXISTS pg_cron;
          CREATE EXTENSION IF NOT EXISTS pg_net;
        `
      });

      // Schedule one-time reminder
      const cronExpression = `${reminderDateTime.getUTCMinutes()} ${reminderDateTime.getUTCHours()} ${reminderDateTime.getUTCDate()} ${reminderDateTime.getUTCMonth() + 1} *`;
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

      await supabase.rpc('exec', {
        sql: `
          SELECT cron.schedule(
            '${jobName}',
            '${cronExpression}',
            $$
            SELECT
              net.http_post(
                  url:='${supabaseUrl}/functions/v1/send-individual-reminder',
                  headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
                  body:='{"reminder_id": "${reminder.id}", "scheduled": true}'::jsonb
              ) as request_id;
            $$
          );
        `
      });

      // Log the cron job
      await supabase
        .from('bill_reminder_jobs')
        .insert({
          bill_reminder_id: reminder.id,
          job_name: jobName,
          cron_expression: cronExpression,
          execution_date: reminderDateTime.toISOString(),
          status: 'scheduled'
        });

      console.log(`✅ Cron job scheduled: ${jobName} at ${reminderDateTime.toISOString()}`);

    } catch (cronError) {
      console.error('⚠️ Error scheduling cron job:', cronError);
      // Update reminder with error but don't fail the request
      await supabase
        .from('bill_reminders')
        .update({
          error_message: `Cron scheduling failed: ${cronError.message}`,
          status: 'pending' // Keep as pending for manual/fallback processing
        })
        .eq('id', reminder.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bill reminder scheduled successfully',
        reminder: {
          id: reminder.id,
          bill_id,
          bill_name: bill.name,
          user_email: bill.profiles?.email,
          reminder_date: reminderDate.toISOString().split('T')[0],
          reminder_time: reminderDateTime.toISOString(),
          due_date: bill.due_date,
          priority,
          status: 'pending'
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error scheduling individual reminder:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to schedule individual bill reminder',
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