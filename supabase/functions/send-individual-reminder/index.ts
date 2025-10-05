import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendReminderRequest {
  reminder_id: string;
  scheduled?: boolean;
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
    const { reminder_id, scheduled = false }: SendReminderRequest = await req.json();
    
    if (!reminder_id) {
      throw new Error('reminder_id is required');
    }

    console.log(`📧 Processing individual bill reminder: ${reminder_id}`, { scheduled });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    const resend = new Resend(resendApiKey);

    // Get reminder details with bill and profile data
    const { data: reminder, error: reminderError } = await supabase
      .from('bill_reminders')
      .select(`
        *,
        bills (
          id, name, amount, due_date, category, status, notes, priority
        ),
        profiles!bill_reminders_user_id_fkey (
          email, full_name, reminder_email, email_notifications_enabled
        )
      `)
      .eq('id', reminder_id)
      .single();

    if (reminderError || !reminder) {
      console.error('❌ Reminder not found:', reminderError);
      throw new Error(`Reminder not found: ${reminderError?.message}`);
    }

    // Check if reminder is already processed
    if (reminder.status === 'sent') {
      console.log('⚠️ Reminder already sent, skipping');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reminder already sent',
          reminder_id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if user still has email notifications enabled
    if (!reminder.profiles?.email_notifications_enabled) {
      console.log('⚠️ User has email notifications disabled, cancelling reminder');
      
      await supabase
        .from('bill_reminders')
        .update({
          status: 'cancelled',
          error_message: 'User disabled email notifications',
          updated_at: new Date().toISOString()
        })
        .eq('id', reminder_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reminder cancelled - user disabled email notifications',
          reminder_id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const bill = reminder.bills;
    const profile = reminder.profiles;
    
    if (!bill || !profile) {
      throw new Error('Bill or profile data missing');
    }

    // Use reminder email if set, otherwise use primary email
    const emailAddress = profile.reminder_email || profile.email;
    if (!emailAddress) {
      throw new Error('No email address found for user');
    }

    const displayName = profile.full_name || emailAddress.split('@')[0];
    
    // Calculate days until due
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate personalized email content
    let subject = '';
    let urgencyLevel = reminder.priority || 'medium';
    let headerColor = '#3b82f6';
    let urgencyText = '';
    
    if (daysUntilDue <= 0) {
      subject = `🚨 URGENT: ${bill.name} - Payment Overdue!`;
      urgencyLevel = 'high';
      headerColor = '#dc2626';
      urgencyText = 'This bill is overdue and may incur late fees!';
    } else if (daysUntilDue === 1) {
      subject = `⚠️ Tomorrow: ${bill.name} - ₹${bill.amount.toLocaleString('en-IN')} Due`;
      urgencyLevel = 'high';
      headerColor = '#ea580c';
      urgencyText = 'This bill is due tomorrow - prepare your payment today!';
    } else {
      subject = `📋 Reminder: ${bill.name} Due in ${daysUntilDue} Days`;
      urgencyText = `You have ${daysUntilDue} days to prepare your payment.`;
    }

    // Create professional HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill Reminder - ${bill.name}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${headerColor}, ${headerColor}dd); color: white; padding: 30px 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💰 InvoiceFlow</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Personal Bill Reminder</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <p style="font-size: 18px; line-height: 1.6; margin: 0 0 25px 0; color: #1f2937;">
              Hi <strong>${displayName}</strong>,
            </p>
            
            <div style="background: ${urgencyLevel === 'high' ? '#fef2f2' : '#f0f9ff'}; border: 2px solid ${urgencyLevel === 'high' ? '#fecaca' : '#bae6fd'}; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <h2 style="margin: 0 0 15px 0; color: ${headerColor}; font-size: 20px;">
                ${daysUntilDue <= 0 ? '🚨' : daysUntilDue === 1 ? '⚠️' : '📋'} Bill Reminder
              </h2>
              <p style="margin: 0; color: ${urgencyLevel === 'high' ? '#b91c1c' : '#0369a1'}; font-size: 16px; font-weight: 600;">
                ${urgencyText}
              </p>
            </div>
            
            <!-- Bill Details Card -->
            <div style="background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 25px; margin: 30px 0; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 20px; color: #1e293b;">${bill.name}</h3>
                <span style="font-size: 24px; font-weight: bold; color: ${headerColor};">
                  ₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b; font-weight: 600;">Due Date</p>
                  <p style="margin: 0; font-size: 16px; color: #1e293b; font-weight: bold;">
                    ${new Date(bill.due_date).toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b; font-weight: 600;">Category</p>
                  <span style="background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: capitalize;">
                    ${bill.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              ${bill.notes ? `
                <div style="margin-top: 15px; padding: 15px; background: #ffffff; border-radius: 8px; border-left: 4px solid ${headerColor};">
                  <p style="margin: 0; font-size: 14px; color: #374151; font-style: italic;">"${bill.notes}"</p>
                </div>
              ` : ''}
              
              <div style="margin-top: 20px; padding: 15px; background: ${daysUntilDue <= 1 ? '#fee2e2' : '#ecfccb'}; border-radius: 8px;">
                <p style="margin: 0; color: ${daysUntilDue <= 1 ? '#b91c1c' : '#365314'}; font-size: 14px; font-weight: 600; text-align: center;">
                  ${daysUntilDue <= 0 
                    ? '🚨 OVERDUE - Pay immediately to avoid additional charges!' 
                    : daysUntilDue === 1 
                    ? '⚠️ Due tomorrow - Don\'t forget to pay!' 
                    : `✅ ${daysUntilDue} days remaining - You're on track!`
                  }
                </p>
              </div>
            </div>
            
            <!-- Call to Action -->
            <div style="text-align: center; margin: 35px 0;">
              <p style="margin: 0 0 20px 0; color: #64748b; font-size: 16px;">Manage your bills easily:</p>
              <a href="https://your-app.lovable.app/bills" 
                 style="display: inline-block; background: linear-gradient(135deg, ${headerColor}, ${headerColor}dd); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                📋 View Bills Dashboard
              </a>
            </div>
            
            <!-- Quick Actions -->
            <div style="background: #f0f9ff; border: 2px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h4 style="margin: 0 0 15px 0; color: #0369a1; font-size: 16px;">💡 Quick Actions</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="text-align: center;">
                  <a href="https://your-app.lovable.app/bills?action=pay&id=${bill.id}" 
                     style="display: block; background: #ffffff; color: #0369a1; padding: 12px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; border: 1px solid #bae6fd;">
                    💳 Mark as Paid
                  </a>
                </div>
                <div style="text-align: center;">
                  <a href="https://your-app.lovable.app/bills?action=edit&id=${bill.id}" 
                     style="display: block; background: #ffffff; color: #0369a1; padding: 12px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; border: 1px solid #bae6fd;">
                    ✏️ Edit Bill
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 35px 0;">
            
            <div style="text-align: center;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0;">
                This is an automated reminder from InvoiceFlow
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                Sent on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with retry mechanism
    let emailSuccess = false;
    let emailError = null;
    let resendEmailId = null;

    for (let attempt = 1; attempt <= reminder.max_retries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${reminder.max_retries} - Sending email to ${emailAddress}...`);
        
        // Get FROM email from env or use default
        const fromEmail = Deno.env.get('RESEND_FROM') || 'Invoices <noreply@invoiceflow.dev>';
        
        console.log(`📧 Attempt ${attempt} - Sending from: ${fromEmail} to: ${emailAddress}`);

        const { data: emailData, error: sendError } = await resend.emails.send({
          from: fromEmail,
          to: [emailAddress],
          subject: subject,
          html: htmlContent,
        });

        if (sendError) {
          throw sendError;
        }

        emailSuccess = true;
        resendEmailId = emailData?.id;
        console.log(`✅ Email sent successfully to ${emailAddress}:`, emailData);
        break;

      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        emailError = error;
        
        if (attempt < reminder.max_retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Update reminder status
    const updateData: any = {
      retry_count: reminder.max_retries,
      email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (emailSuccess) {
      updateData.status = 'sent';
      updateData.delivery_status = 'delivered';
      updateData.resend_email_id = resendEmailId;
    } else {
      updateData.status = 'failed';
      updateData.delivery_status = 'failed';
      updateData.error_message = emailError?.message || 'Unknown email error';
    }

    await supabase
      .from('bill_reminders')
      .update(updateData)
      .eq('id', reminder_id);

    // Update cron job status if scheduled
    if (scheduled) {
      await supabase
        .from('bill_reminder_jobs')
        .update({
          status: emailSuccess ? 'executed' : 'failed',
          executed_at: new Date().toISOString(),
          error_message: emailSuccess ? null : (emailError?.message || 'Email delivery failed'),
          updated_at: new Date().toISOString()
        })
        .eq('bill_reminder_id', reminder_id);
    }

    const response = {
      success: emailSuccess,
      message: emailSuccess ? 'Reminder sent successfully' : 'Failed to send reminder after retries',
      reminder_id,
      bill_name: bill.name,
      user_email: emailAddress,
      due_date: bill.due_date,
      days_until_due: daysUntilDue,
      attempts: reminder.max_retries,
      email_id: resendEmailId,
      error: emailSuccess ? null : emailError?.message
    };

    return new Response(
      JSON.stringify(response),
      {
        status: emailSuccess ? 200 : 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error sending individual reminder:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to send individual bill reminder',
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