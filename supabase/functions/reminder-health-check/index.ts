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
    console.log('🔍 Starting bill reminder health check...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Find reminders that should have been sent but are still pending
    const { data: missedReminders, error: missedError } = await supabase
      .from('bill_reminders')
      .select(`
        *,
        bills (name, due_date, amount),
        profiles!bill_reminders_user_id_fkey (email, full_name)
      `)
      .eq('status', 'pending')
      .lte('reminder_date', today);

    if (missedError) {
      console.error('❌ Error fetching missed reminders:', missedError);
      throw new Error(`Database error: ${missedError.message}`);
    }

    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    console.log(`📋 Found ${missedReminders?.length || 0} missed reminders to process`);

    // Process missed reminders
    if (missedReminders && missedReminders.length > 0) {
      for (const reminder of missedReminders) {
        try {
          console.log(`🔄 Processing missed reminder: ${reminder.id} for bill: ${reminder.bills?.name}`);
          
          // Send the reminder immediately
          const { error: sendError } = await supabase.functions.invoke('send-individual-reminder', {
            body: {
              reminder_id: reminder.id,
              scheduled: false // Mark as manual/health-check send
            }
          });

          if (sendError) {
            console.error(`❌ Failed to send reminder ${reminder.id}:`, sendError);
            errorCount++;
            results.push({
              reminder_id: reminder.id,
              bill_name: reminder.bills?.name,
              status: 'failed',
              error: sendError.message
            });
          } else {
            console.log(`✅ Successfully processed reminder ${reminder.id}`);
            processedCount++;
            results.push({
              reminder_id: reminder.id,
              bill_name: reminder.bills?.name,
              status: 'sent'
            });
          }
        } catch (error: any) {
          console.error(`❌ Error processing reminder ${reminder.id}:`, error);
          errorCount++;
          results.push({
            reminder_id: reminder.id,
            bill_name: reminder.bills?.name || 'Unknown',
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Check for failed cron jobs and reschedule if needed
    const { data: failedJobs, error: jobsError } = await supabase
      .from('bill_reminder_jobs')
      .select(`
        *,
        bill_reminders (
          id, status, bill_id,
          bills (name, due_date)
        )
      `)
      .eq('status', 'failed')
      .gte('execution_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    let rescheduledJobs = 0;
    
    if (failedJobs && failedJobs.length > 0) {
      console.log(`📋 Found ${failedJobs.length} failed cron jobs to potentially reschedule`);
      
      for (const job of failedJobs) {
        // Only reschedule if the reminder is still pending and due date hasn't passed
        if (job.bill_reminders?.status === 'pending') {
          const billDueDate = new Date(job.bill_reminders.bills?.due_date || '');
          if (billDueDate > now) {
            try {
              // Reschedule for immediate execution
              const { error: rescheduleError } = await supabase.functions.invoke('send-individual-reminder', {
                body: {
                  reminder_id: job.bill_reminders.id,
                  scheduled: false
                }
              });

              if (!rescheduleError) {
                rescheduledJobs++;
                console.log(`✅ Rescheduled failed job for reminder ${job.bill_reminders.id}`);
              }
            } catch (error) {
              console.error(`❌ Failed to reschedule job for reminder ${job.bill_reminders.id}:`, error);
            }
          }
        }
      }
    }

    // Check for upcoming reminders that need scheduling
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: upcomingBills, error: upcomingError } = await supabase
      .from('bills')
      .select('*')
      .eq('auto_reminder_enabled', true)
      .in('status', ['unpaid', 'overdue'])
      .gte('due_date', tomorrowStr);

    let newRemindersScheduled = 0;

    if (upcomingBills && upcomingBills.length > 0) {
      for (const bill of upcomingBills) {
        // Check if reminder already exists
        const reminderDate = new Date(bill.due_date);
        reminderDate.setDate(reminderDate.getDate() - (bill.reminder_days_before || 1));
        
        if (reminderDate >= now) {
          const { data: existingReminder } = await supabase
            .from('bill_reminders')
            .select('id')
            .eq('bill_id', bill.id)
            .eq('reminder_date', reminderDate.toISOString().split('T')[0])
            .single();

          if (!existingReminder) {
            try {
              const { error: scheduleError } = await supabase.functions.invoke('schedule-individual-reminder', {
                body: {
                  bill_id: bill.id,
                  reminder_days_before: bill.reminder_days_before || 1,
                  priority: bill.priority || 'medium'
                }
              });

              if (!scheduleError) {
                newRemindersScheduled++;
                console.log(`✅ Scheduled new reminder for bill ${bill.name}`);
              }
            } catch (error) {
              console.error(`❌ Failed to schedule reminder for bill ${bill.id}:`, error);
            }
          }
        }
      }
    }

    const healthCheckSummary = {
      success: true,
      timestamp: now.toISOString(),
      health_check_results: {
        missed_reminders_found: missedReminders?.length || 0,
        missed_reminders_processed: processedCount,
        missed_reminders_failed: errorCount,
        failed_jobs_found: failedJobs?.length || 0,
        failed_jobs_rescheduled: rescheduledJobs,
        upcoming_bills_checked: upcomingBills?.length || 0,
        new_reminders_scheduled: newRemindersScheduled
      },
      processed_reminders: results,
      recommendations: []
    };

    // Add recommendations based on findings
    if (errorCount > 0) {
      healthCheckSummary.recommendations.push('Some reminders failed to send. Check RESEND_API_KEY configuration and email settings.');
    }
    
    if (failedJobs && failedJobs.length > rescheduledJobs) {
      healthCheckSummary.recommendations.push('Some failed cron jobs could not be rescheduled. Manual intervention may be required.');
    }
    
    if (newRemindersScheduled > 0) {
      healthCheckSummary.recommendations.push(`Scheduled ${newRemindersScheduled} new reminders that were missing.`);
    }

    if (healthCheckSummary.recommendations.length === 0) {
      healthCheckSummary.recommendations.push('All bill reminders are healthy and properly scheduled.');
    }

    console.log('✅ Health check completed:', healthCheckSummary.health_check_results);

    return new Response(
      JSON.stringify(healthCheckSummary),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Health check error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Bill reminder health check failed',
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