import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 5;
const BATCH_SIZE = 50; // Rate limit: process 50 per run

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      service: 'run-reminders-due',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🔄 Starting catch-up worker for due reminders...');
    
    // Initialize Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    
    // Query pending reminders whose scheduled send time has passed
    const { data: dueReminders, error: queryError } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_send_at', now.toISOString())
      .not('scheduled_send_at', 'is', null)
      .lt('retry_count', MAX_RETRIES)
      .order('scheduled_send_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('❌ Error querying due reminders:', queryError);
      throw queryError;
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log('✅ No due reminders to process');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No due reminders to process',
          processed: 0,
          sent: 0,
          failed: 0,
          retried: 0,
          timestamp: now.toISOString()
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`📋 Found ${dueReminders.length} due reminders to process`);

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let retried = 0;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        processed++;
        
        console.log(`📤 Processing reminder ${reminder.id} (attempt ${reminder.retry_count + 1}/${MAX_RETRIES})`);

        // Atomic update to mark in-progress and prevent double processing
        const { error: lockError } = await supabase
          .from('bill_reminders')
          .update({ 
            status: 'processing',
            updated_at: now.toISOString()
          })
          .eq('id', reminder.id)
          .eq('status', 'pending'); // Only update if still pending

        if (lockError) {
          console.warn(`⚠️ Could not lock reminder ${reminder.id}, skipping (may be processing elsewhere)`);
          continue;
        }

        // Call send-individual-reminder edge function using service role key
        const sendResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-individual-reminder`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
              reminder_id: reminder.id,
              scheduled: false // Indicate this is a catch-up send
            })
          }
        );

        const sendResult = await sendResponse.json();

        if (sendResponse.ok && sendResult.success) {
          // Success: mark as sent
          await supabase
            .from('bill_reminders')
            .update({
              status: 'sent',
              delivery_status: 'queued',
              sent_at: now.toISOString(),
              error_message: null,
              updated_at: now.toISOString()
            })
            .eq('id', reminder.id);

          sent++;
          console.log(`✅ Reminder ${reminder.id} sent successfully`);
        } else {
          // Failure: increment retry count
          const newRetryCount = reminder.retry_count + 1;
          const maxRetriesReached = newRetryCount >= MAX_RETRIES;

          await supabase
            .from('bill_reminders')
            .update({
              status: maxRetriesReached ? 'failed' : 'pending',
              retry_count: newRetryCount,
              error_message: sendResult.error || sendResult.message || 'Unknown error during catch-up send',
              updated_at: now.toISOString()
            })
            .eq('id', reminder.id);

          if (maxRetriesReached) {
            failed++;
            console.error(`❌ Reminder ${reminder.id} failed after ${MAX_RETRIES} retries`);
          } else {
            retried++;
            console.warn(`⚠️ Reminder ${reminder.id} failed, retry count now ${newRetryCount}`);
          }
        }
      } catch (reminderError: any) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, reminderError);
        
        // On exception, increment retry count
        const newRetryCount = reminder.retry_count + 1;
        const maxRetriesReached = newRetryCount >= MAX_RETRIES;

        await supabase
          .from('bill_reminders')
          .update({
            status: maxRetriesReached ? 'failed' : 'pending',
            retry_count: newRetryCount,
            error_message: reminderError.message || 'Exception during catch-up processing',
            updated_at: now.toISOString()
          })
          .eq('id', reminder.id);

        if (maxRetriesReached) {
          failed++;
        } else {
          retried++;
        }
      }
    }

    const summary = {
      success: true,
      message: 'Catch-up worker completed',
      processed,
      sent,
      failed,
      retried,
      timestamp: now.toISOString()
    };

    console.log('📊 Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in catch-up worker:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to process due reminders',
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
