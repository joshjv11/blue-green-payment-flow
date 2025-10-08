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

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      service: 'schedule-individual-reminder',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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

    // Fetch bill details (2-query pattern for resilience)
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, user_id, name, amount, due_date, status, category, notes, priority, reminder_days_before, auto_reminder_enabled')
      .eq('id', bill_id)
      .single();

    if (billError || !bill) {
      console.error('❌ Error fetching bill:', billError);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'BILL_NOT_FOUND',
          details: billError?.message || 'Bill not found',
          bill_id
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Fetch profile separately
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, email_notifications_enabled, reminder_email')
      .eq('id', bill.user_id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'PROFILE_NOT_FOUND',
          details: profileError?.message || 'User profile not found',
          bill_id
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if user has email notifications enabled
    if (!profile.email_notifications_enabled) {
      console.log('⚠️ User has email notifications disabled, skipping reminder scheduling');
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'EMAIL_DISABLED_OR_MISSING',
          message: 'User has email notifications disabled',
          bill_id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!profile.email) {
      console.log('⚠️ User has no email address');
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'EMAIL_DISABLED_OR_MISSING',
          message: 'User has no email address',
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

    // Calculate IST time for 9 AM reminder (3:30 AM UTC)
    const nineAmIST = new Date(reminderDate);
    nineAmIST.setUTCHours(3, 30, 0, 0); // 9:00 AM IST = 3:30 AM UTC
    
    const now = new Date();
    const timeUntilNineAmIST = nineAmIST.getTime() - now.getTime();
    const oneHourInMs = 60 * 60 * 1000;
    
    // Get keys for later use
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    // Determine final schedule time
    let scheduleAt: Date;
    let schedulingReason: string;
    
    if (nineAmIST <= now) {
      // Time has already passed, schedule for now + 2 minutes
      scheduleAt = new Date(now.getTime() + 2 * 60 * 1000);
      schedulingReason = 'Intended time has passed, scheduling for now + 2 minutes';
    } else if (timeUntilNineAmIST <= oneHourInMs) {
      // Within the next hour, schedule for now + 2 minutes (for testing)
      scheduleAt = new Date(now.getTime() + 2 * 60 * 1000);
      schedulingReason = 'Reminder window within next hour, scheduling for now + 2 minutes (fast test mode)';
    } else {
      // Schedule for the original 9 AM IST time
      scheduleAt = nineAmIST;
      schedulingReason = 'Scheduling for original 9:00 AM IST time';
    }

    // Store the computed send time in the reminder record
    await supabase
      .from('bill_reminders')
      .update({ scheduled_send_at: scheduleAt.toISOString() })
      .eq('id', reminder.id);

    console.log(`✅ Bill reminder scheduled successfully:`, {
      reminder_id: reminder.id,
      bill_id,
      bill_name: bill.name,
      user_email: profile.email,
      reminder_date: reminderDate.toISOString().split('T')[0],
      due_date: bill.due_date,
      reminder_days_before,
      priority,
      computed_send_time_utc: nineAmIST.toISOString(),
      final_schedule_time_utc: scheduleAt.toISOString(),
      scheduling_reason: schedulingReason,
      using_key: anonKey ? 'anon_key' : 'service_key'
    });

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

      // Unschedule any existing job with this name to avoid duplicates
      await supabase.rpc('exec', {
        sql: `
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = '${jobName}') THEN
              PERFORM cron.unschedule('${jobName}');
            END IF;
          END $$;
        `
      });

      // Build cron expression from final scheduleAt time
      const cronExpression = `${scheduleAt.getUTCMinutes()} ${scheduleAt.getUTCHours()} ${scheduleAt.getUTCDate()} ${scheduleAt.getUTCMonth() + 1} *`;

      console.log(`📅 Scheduling cron job: ${jobName}`, {
        cron_expression: cronExpression,
        execution_time_utc: scheduleAt.toISOString(),
        reminder_id: reminder.id
      });

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
          execution_date: scheduleAt.toISOString(),
          status: 'scheduled'
        });

      console.log(`✅ Cron job scheduled: ${jobName} at ${scheduleAt.toISOString()}`);

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
          user_email: profile.email,
          reminder_date: reminderDate.toISOString().split('T')[0],
          computed_send_time_utc: nineAmIST.toISOString(),
          final_schedule_time_utc: scheduleAt.toISOString(),
          scheduling_reason: schedulingReason,
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