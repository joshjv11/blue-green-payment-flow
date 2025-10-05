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
      service: 'send-bill-reminders',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🔔 Starting bill reminder check...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY environment variable not configured');
      throw new Error('RESEND_API_KEY not configured');
    }
    
    console.log('🔑 RESEND_API_KEY found, initializing Resend client...');
    const resend = new Resend(resendApiKey);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`📅 Checking bills due today (${todayStr}) and tomorrow (${tomorrowStr})`);

    // Fetch bills due today or tomorrow that are unpaid
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        id, user_id, name, amount, due_date, category, status, notes
      `)
      .in('status', ['unpaid', 'overdue'])
      .in('due_date', [todayStr, tomorrowStr]);

    if (billsError) {
      console.error('❌ Error fetching bills:', billsError);
      throw billsError;
    }

    if (!bills || bills.length === 0) {
      console.log('✅ No bills due today or tomorrow');
      return new Response(
        JSON.stringify({ message: 'No bills due for reminders', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📋 Found ${bills.length} bills requiring reminders`);

    // Group bills by user
    const billsByUser = new Map<string, Bill[]>();
    bills.forEach((bill) => {
      if (!billsByUser.has(bill.user_id)) {
        billsByUser.set(bill.user_id, []);
      }
      billsByUser.get(bill.user_id)!.push(bill);
    });

    console.log(`👥 Processing reminders for ${billsByUser.size} users`);

    // Fetch user profiles for all unique user IDs
    const userIds = Array.from(billsByUser.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      throw profilesError;
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send reminders to each user
    for (const [userId, userBills] of billsByUser) {
      const profile = profiles?.find(p => p.id === userId);
      if (!profile || !profile.email) {
        console.log(`⚠️ No email found for user ${userId}, skipping`);
        continue;
      }

      try {
        const billsDueToday = userBills.filter(b => b.due_date === todayStr);
        const billsDueTomorrow = userBills.filter(b => b.due_date === tomorrowStr);
        
        const totalAmount = userBills.reduce((sum, bill) => sum + bill.amount, 0);
        const displayName = profile.full_name || profile.email.split('@')[0];

        // Create email content
        let subject = '';
        let greeting = `Hi ${displayName},`;
        let content = '';

        if (billsDueToday.length > 0 && billsDueTomorrow.length > 0) {
          subject = `💰 ${billsDueToday.length + billsDueTomorrow.length} Bills Need Your Attention`;
          content = `
            <p>You have bills due today and tomorrow that need your attention:</p>
            
            <h3 style="color: #dc2626; margin: 20px 0 10px 0;">🚨 Due Today (${todayStr})</h3>
            ${billsDueToday.map(bill => `
              <div style="background: #fef2f2; padding: 15px; margin: 10px 0; border-left: 4px solid #dc2626; border-radius: 4px;">
                <strong>${bill.name}</strong> - ₹${bill.amount.toFixed(2)}<br>
                <small style="color: #666;">Category: ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}</small>
                ${bill.notes ? `<br><small style="color: #666;">Note: ${bill.notes}</small>` : ''}
              </div>
            `).join('')}
            
            <h3 style="color: #ea580c; margin: 20px 0 10px 0;">⏰ Due Tomorrow (${tomorrowStr})</h3>
            ${billsDueTomorrow.map(bill => `
              <div style="background: #fff7ed; padding: 15px; margin: 10px 0; border-left: 4px solid #ea580c; border-radius: 4px;">
                <strong>${bill.name}</strong> - ₹${bill.amount.toFixed(2)}<br>
                <small style="color: #666;">Category: ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}</small>
                ${bill.notes ? `<br><small style="color: #666;">Note: ${bill.notes}</small>` : ''}
              </div>
            `).join('')}
          `;
        } else if (billsDueToday.length > 0) {
          subject = `🚨 ${billsDueToday.length} Bill${billsDueToday.length > 1 ? 's' : ''} Due Today`;
          content = `
            <p style="color: #dc2626; font-weight: bold;">You have ${billsDueToday.length} bill${billsDueToday.length > 1 ? 's' : ''} due today that need${billsDueToday.length === 1 ? 's' : ''} immediate attention:</p>
            
            ${billsDueToday.map(bill => `
              <div style="background: #fef2f2; padding: 15px; margin: 10px 0; border-left: 4px solid #dc2626; border-radius: 4px;">
                <strong>${bill.name}</strong> - ₹${bill.amount.toFixed(2)}<br>
                <small style="color: #666;">Category: ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}</small>
                ${bill.notes ? `<br><small style="color: #666;">Note: ${bill.notes}</small>` : ''}
              </div>
            `).join('')}
          `;
        } else {
          subject = `⏰ ${billsDueTomorrow.length} Bill${billsDueTomorrow.length > 1 ? 's' : ''} Due Tomorrow`;
          content = `
            <p>Don't forget! You have ${billsDueTomorrow.length} bill${billsDueTomorrow.length > 1 ? 's' : ''} due tomorrow:</p>
            
            ${billsDueTomorrow.map(bill => `
              <div style="background: #fff7ed; padding: 15px; margin: 10px 0; border-left: 4px solid #ea580c; border-radius: 4px;">
                <strong>${bill.name}</strong> - ₹${bill.amount.toFixed(2)}<br>
                <small style="color: #666;">Category: ${bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}</small>
                ${bill.notes ? `<br><small style="color: #666;">Note: ${bill.notes}</small>` : ''}
              </div>
            `).join('')}
          `;
        }

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">💰 InvoiceFlow Bill Reminder</h1>
            </div>
            
            <div style="padding: 30px 20px;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${greeting}</p>
              
              ${content}
              
              <div style="background: #f8fafc; padding: 20px; margin: 25px 0; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">📊 Summary</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #3b82f6;">
                  Total Amount: ₹${totalAmount.toFixed(2)}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">
                  ${userBills.length} bill${userBills.length > 1 ? 's' : ''} requiring attention
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 15px 0; color: #64748b;">Keep track of all your bills:</p>
                <a href="${Deno.env.get('APP_URL') || 'https://invoiceflow.dev'}/bills" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  📋 View All Bills
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #64748b; margin: 0; text-align: center;">
                This is an automated reminder from InvoiceFlow. Stay on top of your finances! 💪
              </p>
            </div>
          </div>
        `;

    // Get FROM email from env or use default
    const fromEmail = Deno.env.get('RESEND_FROM') || 'Invoices <noreply@invoiceflow.dev>';
    
    console.log(`📧 Sending email from: ${fromEmail} to: ${profile.email}`);

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [profile.email],
      subject: subject,
      html: htmlContent,
    });

        if (emailError) {
          console.error(`❌ Failed to send email to ${profile.email}:`, {
            error: emailError,
            errorMessage: emailError.message || 'Unknown error',
            errorName: emailError.name || 'EmailError',
            recipientEmail: profile.email,
            subjectLine: subject
          });
          emailsFailed++;
        } else {
          console.log(`✅ Reminder sent successfully to ${profile.email} - Subject: ${subject}`);
          emailsSent++;
        }

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, {
          userId,
          userEmail: profile?.email || 'unknown',
          error: error.message,
          errorName: error.name,
          billsCount: userBills.length
        });
        emailsFailed++;
      }
    }

    console.log(`📧 Email summary: ${emailsSent} sent, ${emailsFailed} failed`);

    // Also trigger SMS notifications if configured
    try {
      console.log('📱 Triggering SMS notifications...');
      const smsResponse = await supabase.functions.invoke('send-sms-notifications', {
        body: { scheduled: true, time: new Date().toISOString() }
      });
      
      if (smsResponse.error) {
        console.error('⚠️ SMS notification error:', smsResponse.error);
      } else {
        console.log('✅ SMS notifications triggered successfully');
      }
    } catch (smsError) {
      console.error('❌ Failed to trigger SMS notifications:', smsError);
      // Don't fail the whole process if SMS fails
    }

    return new Response(
      JSON.stringify({
        message: 'Bill reminders processed',
        billsProcessed: bills.length,
        usersNotified: billsByUser.size,
        emailsSent,
        emailsFailed
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Bill reminder function error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      stack: error.stack || 'No stack trace',
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: 'Failed to process bill reminders',
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