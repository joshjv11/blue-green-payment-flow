import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CRON JOB: Process Due Reminders
 * This function is called daily by pg_cron to find and send due reminders.
 * It looks for reminders with status='pending' and reminder_date <= today,
 * then invokes send-individual-reminder for each one.
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      service: 'process-due-reminders',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('⏰ Processing due reminders...');
    const startTime = Date.now();

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Processing reminders due on or before: ${today}`);

    // Find all pending reminders that are due today or earlier (2-query pattern)
    const { data: dueReminders, error: fetchError } = await supabase
      .from('bill_reminders')
      .select('id, bill_id, user_id, reminder_date, priority')
      .eq('status', 'pending')
      .lte('reminder_date', today)
      .order('priority', { ascending: false }) // High priority first
      .order('reminder_date', { ascending: true }); // Older reminders first

    if (fetchError) {
      console.error('❌ Error fetching due reminders:', fetchError);
      throw fetchError;
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log('✅ No due reminders found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No due reminders to process',
          processed: 0,
          skipped: 0,
          failed: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`📋 Found ${dueReminders.length} due reminders to process`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const results: any[] = [];

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        // Fetch profile to check email notifications
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_notifications_enabled, email')
          .eq('id', reminder.user_id)
          .single();

        // Check if user has email notifications enabled
        if (!profile?.email_notifications_enabled) {
          console.log(`⚠️ Skipping reminder ${reminder.id} - user has notifications disabled`);
          
          // Mark as cancelled
          await supabase
            .from('bill_reminders')
            .update({
              status: 'cancelled',
              error_message: 'User disabled email notifications',
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id);
          
          skipped++;
          continue;
        }

        // Fetch bill name for logging
        const { data: bill } = await supabase
          .from('bills')
          .select('name')
          .eq('id', reminder.bill_id)
          .single();

        console.log(`📧 Processing reminder ${reminder.id} for bill: ${bill?.name || 'Unknown'}`);

        // Invoke send-individual-reminder function
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          'send-individual-reminder',
          {
            body: {
              reminder_id: reminder.id,
              scheduled: true
            }
          }
        );

        if (sendError) {
          console.error(`❌ Failed to send reminder ${reminder.id}:`, sendError);
          
          // Update reminder with error
          await supabase
            .from('bill_reminders')
            .update({
              status: 'failed',
              error_message: sendError.message || 'Failed to send reminder',
              retry_count: 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id);
          
          failed++;
          results.push({
            reminder_id: reminder.id,
            status: 'failed',
            error: sendError.message
          });
        } else {
          console.log(`✅ Reminder ${reminder.id} processed successfully`);
          
          // Update reminder status with sent timestamp
          await supabase
            .from('bill_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              retry_count: 0
            })
            .eq('id', reminder.id);
          
          processed++;
          results.push({
            reminder_id: reminder.id,
            status: 'sent',
            result: sendResult
          });
        }

      } catch (error: any) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error);
        failed++;
        results.push({
          reminder_id: reminder.id,
          status: 'error',
          error: error.message
        });
      }

      // Small delay between reminders to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ Processing completed in ${duration}ms`);
    console.log(`📊 Summary: ${processed} processed, ${skipped} skipped, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Due reminders processed',
        total: dueReminders.length,
        processed,
        skipped,
        failed,
        duration_ms: duration,
        results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in process-due-reminders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
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
