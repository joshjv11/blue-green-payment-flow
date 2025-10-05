import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  reminder_email: string | null;
  email_notifications_enabled: boolean;
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
      service: 'send-bill-reminders-enhanced',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check if this is a manual test request
    const requestBody = req.method === 'POST' ? await req.json() : {};
    const isTest = requestBody.test === true;
    const isManual = requestBody.manual === true;
    
    console.log('🔔 Starting enhanced bill reminder check...', { isTest, isManual });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend with enhanced error handling
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY environment variable not configured');
      throw new Error('RESEND_API_KEY not configured. Please add your Resend API key to Supabase secrets.');
    }
    
    console.log('🔑 RESEND_API_KEY found, initializing Resend client...');
    const resend = new Resend(resendApiKey);

    // Calculate dates in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istNow = new Date(now.getTime() + istOffset);
    
    const today = new Date(istNow);
    const tomorrow = new Date(istNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`📅 IST Date Check - Today: ${todayStr}, Tomorrow: ${tomorrowStr}, Current IST: ${istNow.toISOString()}`);

    // Fetch bills due today or tomorrow that are unpaid/overdue (2-query pattern)
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('id, user_id, name, amount, due_date, category, status, notes')
      .in('status', ['unpaid', 'overdue'])
      .in('due_date', [todayStr, tomorrowStr]);

    if (billsError) {
      console.error('❌ Error fetching bills:', billsError);
      throw new Error(`Database error while fetching bills: ${billsError.message}`);
    }

    if (!bills || bills.length === 0) {
      console.log('✅ No bills due today or tomorrow for email reminders');
      return new Response(
        JSON.stringify({ 
          message: 'No bills due for email reminders', 
          count: 0,
          dateChecked: { todayStr, tomorrowStr },
          istTime: istNow.toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📋 Found ${bills.length} bills requiring email reminders`);

    // Group bills by user
    const billsByUser = new Map<string, Bill[]>();
    bills.forEach((bill) => {
      if (!billsByUser.has(bill.user_id)) {
        billsByUser.set(bill.user_id, []);
      }
      billsByUser.get(bill.user_id)!.push(bill);
    });

    console.log(`👥 Processing email reminders for ${billsByUser.size} users`);

    // Fetch user profiles for all unique user IDs (only those with email notifications enabled)
    const userIds = Array.from(billsByUser.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, reminder_email, email_notifications_enabled')
      .in('id', userIds)
      .eq('email_notifications_enabled', true);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      throw new Error(`Database error while fetching profiles: ${profilesError.message}`);
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    const failedEmails: string[] = [];
    const emailDetails: any[] = [];

    // Send enhanced email reminders to each user with email notifications enabled
    for (const [userId, userBills] of billsByUser) {
      const profile = profiles?.find(p => p.id === userId);
      
      if (!profile) {
        console.log(`⚠️ No profile found for user ${userId}, skipping`);
        continue;
      }

      if (!profile.email_notifications_enabled) {
        console.log(`⚠️ Email notifications disabled for user ${userId}, skipping`);
        continue;
      }

      // Use reminder email if set, otherwise use primary email
      const emailAddress = profile.reminder_email || profile.email;
      if (!emailAddress) {
        console.log(`⚠️ No email address found for user ${userId}, skipping`);
        continue;
      }

      try {
        const billsDueToday = userBills.filter(b => b.due_date === todayStr);
        const billsDueTomorrow = userBills.filter(b => b.due_date === tomorrowStr);
        
        const totalAmount = userBills.reduce((sum, bill) => sum + bill.amount, 0);
        const displayName = profile.full_name || emailAddress.split('@')[0];

        // Enhanced email content with professional formatting
        let subject = '';
        let content = '';
        let urgencyLevel = 'medium';

        if (billsDueToday.length > 0 && billsDueTomorrow.length > 0) {
          subject = `🚨 ${billsDueToday.length + billsDueTomorrow.length} Bills Need Your Immediate Attention`;
          urgencyLevel = 'high';
          content = `
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">🚨 Urgent Bills Alert</h2>
              <p style="margin: 0; opacity: 0.95;">You have bills due today and tomorrow that require immediate attention!</p>
            </div>
            
            <h3 style="color: #dc2626; margin: 25px 0 15px 0; font-size: 18px;">🔴 Due Today (${todayStr})</h3>
            ${billsDueToday.map(bill => `
              <div style="background: #fef2f2; padding: 20px; margin: 15px 0; border-left: 5px solid #dc2626; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="font-size: 16px; color: #1f2937;">${bill.name}</strong>
                  <span style="font-size: 18px; font-weight: bold; color: #dc2626;">₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                  <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 12px; text-transform: capitalize;">
                    ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}
                  </span>
                </div>
                ${bill.notes ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #4b5563; font-size: 14px;">"${bill.notes}"</p>` : ''}
                <div style="margin-top: 15px; padding: 10px; background: #fee2e2; border-radius: 6px;">
                  <p style="margin: 0; color: #b91c1c; font-size: 13px; font-weight: 600;">⚠️ PAY TODAY to avoid late fees!</p>
                </div>
              </div>
            `).join('')}
            
            <h3 style="color: #ea580c; margin: 25px 0 15px 0; font-size: 18px;">🟡 Due Tomorrow (${tomorrowStr})</h3>
            ${billsDueTomorrow.map(bill => `
              <div style="background: #fff7ed; padding: 20px; margin: 15px 0; border-left: 5px solid #ea580c; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="font-size: 16px; color: #1f2937;">${bill.name}</strong>
                  <span style="font-size: 18px; font-weight: bold; color: #ea580c;">₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                  <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 12px; text-transform: capitalize;">
                    ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}
                  </span>
                </div>
                ${bill.notes ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #4b5563; font-size: 14px;">"${bill.notes}"</p>` : ''}
              </div>
            `).join('')}
          `;
        } else if (billsDueToday.length > 0) {
          subject = `🚨 ${billsDueToday.length} Bill${billsDueToday.length > 1 ? 's' : ''} Due TODAY - Action Required`;
          urgencyLevel = 'high';
          content = `
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">🚨 Bills Due Today!</h2>
              <p style="margin: 0; opacity: 0.95;">These bills need to be paid today to avoid late fees.</p>
            </div>
            
            ${billsDueToday.map(bill => `
              <div style="background: #fef2f2; padding: 20px; margin: 15px 0; border-left: 5px solid #dc2626; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="font-size: 16px; color: #1f2937;">${bill.name}</strong>
                  <span style="font-size: 18px; font-weight: bold; color: #dc2626;">₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                  <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 12px; text-transform: capitalize;">
                    ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}
                  </span>
                </div>
                ${bill.notes ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #4b5563; font-size: 14px;">"${bill.notes}"</p>` : ''}
                <div style="margin-top: 15px; padding: 10px; background: #fee2e2; border-radius: 6px;">
                  <p style="margin: 0; color: #b91c1c; font-size: 13px; font-weight: 600;">⚠️ PAY TODAY to avoid late fees!</p>
                </div>
              </div>
            `).join('')}
          `;
        } else {
          subject = `⏰ ${billsDueTomorrow.length} Bill${billsDueTomorrow.length > 1 ? 's' : ''} Due Tomorrow - Get Ready`;
          urgencyLevel = 'medium';
          content = `
            <div style="background: linear-gradient(135deg, #ea580c, #f97316); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">⏰ Bills Due Tomorrow</h2>
              <p style="margin: 0; opacity: 0.95;">Don't forget! These bills are due tomorrow.</p>
            </div>
            
            ${billsDueTomorrow.map(bill => `
              <div style="background: #fff7ed; padding: 20px; margin: 15px 0; border-left: 5px solid #ea580c; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="font-size: 16px; color: #1f2937;">${bill.name}</strong>
                  <span style="font-size: 18px; font-weight: bold; color: #ea580c;">₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                  <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 12px; text-transform: capitalize;">
                    ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}
                  </span>
                </div>
                ${bill.notes ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #4b5563; font-size: 14px;">"${bill.notes}"</p>` : ''}
              </div>
            `).join('')}
          `;
        }

        // Professional HTML email template
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>InvoiceFlow Bill Reminder</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px 25px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💰 InvoiceFlow</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Your Personal Bill Management System</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px 25px;">
                <p style="font-size: 18px; line-height: 1.6; margin: 0 0 25px 0; color: #1f2937;">
                  Hi <strong>${displayName}</strong>,
                </p>
                
                ${content}
                
                <!-- Summary Section -->
                <div style="background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 25px; margin: 30px 0; border-radius: 12px; border: 2px solid #e2e8f0;">
                  <div style="text-align: center;">
                    <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 20px;">📊 Payment Summary</h3>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <p style="margin: 0; font-size: 32px; font-weight: bold; color: #3b82f6;">
                        ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; color: #64748b;">
                        Total Amount Due • ${userBills.length} Bill${userBills.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 35px 0;">
                  <p style="margin: 0 0 20px 0; color: #64748b; font-size: 16px;">Manage all your bills in one place:</p>
                  <a href="https://your-app.lovable.app/bills" 
                     style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                    📋 View & Pay Bills
                  </a>
                </div>
                
                <!-- Tips Section -->
                <div style="background: #f0f9ff; border: 2px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h4 style="margin: 0 0 10px 0; color: #0369a1; font-size: 16px;">💡 Pro Tips for Better Bill Management</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
                    <li style="margin-bottom: 8px;">Set up automatic payments for recurring bills</li>
                    <li style="margin-bottom: 8px;">Enable email notifications for upcoming due dates</li>
                    <li style="margin-bottom: 8px;">Review and categorize your bills monthly</li>
                    <li>Keep digital receipts organized in InvoiceFlow</li>
                  </ul>
                </div>
                
                <!-- Footer -->
                <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 35px 0;">
                
                <div style="text-align: center;">
                  <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0;">
                    This is an automated bill reminder from InvoiceFlow
                  </p>
                  <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    Sent on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST • Stay on top of your finances! 💪
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email with retry mechanism
        let attempts = 0;
        const maxAttempts = 3;
        let emailSuccess = false;

        while (attempts < maxAttempts && !emailSuccess) {
          attempts++;
          try {
            console.log(`📧 Attempt ${attempts}/${maxAttempts} - Sending email to ${emailAddress}...`);
            
            const { data: emailData, error: emailError } = await resend.emails.send({
              from: 'InvoiceFlow <no-reply@invoiceflow.dev>',
              to: [emailAddress],
              subject: subject,
              html: htmlContent,
            });

            if (emailError) {
              throw emailError;
            }

            console.log(`✅ Email sent successfully to ${emailAddress} - ID: ${emailData?.id} - Subject: ${subject}`);
            emailsSent++;
            emailSuccess = true;
            
            emailDetails.push({
              userId,
              email: emailAddress,
              subject,
              billsCount: userBills.length,
              totalAmount: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              urgencyLevel,
              attempt: attempts,
              emailId: emailData?.id
            });

          } catch (emailError: any) {
            console.error(`❌ Attempt ${attempts} failed for ${emailAddress}:`, {
              error: emailError,
              errorMessage: emailError.message || 'Unknown email error',
              errorName: emailError.name || 'EmailError',
              recipientEmail: emailAddress,
              subjectLine: subject,
              attempt: attempts
            });
            
            if (attempts === maxAttempts) {
              emailsFailed++;
              failedEmails.push(emailAddress);
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, {
          userId,
          userEmail: emailAddress || 'unknown',
          error: error.message,
          errorName: error.name,
          billsCount: userBills.length
        });
        emailsFailed++;
        failedEmails.push(emailAddress || `user-${userId}`);
      }
    }

    const summary = {
      message: 'Enhanced bill reminders processed',
      billsProcessed: bills.length,
      usersNotified: billsByUser.size,
      emailsSent,
      emailsFailed,
      successRate: `${((emailsSent / (emailsSent + emailsFailed)) * 100).toFixed(1)}%`,
      dateProcessed: { todayStr, tomorrowStr },
      istTime: istNow.toISOString(),
      emailDetails,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined
    };

    console.log(`📊 Email summary:`, summary);

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Enhanced bill reminder function error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      stack: error.stack || 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: 'Failed to process enhanced bill reminders',
        timestamp: new Date().toISOString(),
        errorType: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);