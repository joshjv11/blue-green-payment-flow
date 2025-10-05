import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@2.0.0";

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
    console.log('📧 Processing comprehensive test email request...');

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ Resend API key not configured');
      throw new Error('Resend API key not configured');
    }

    const resend = new Resend(resendApiKey);

    // Parse request body
    const { email, testType = 'sample_bills' } = await req.json();

    if (!email) {
      throw new Error('Email address is required for test email');
    }

    const displayName = email.split('@')[0];

    // Create sample bill data for testing
    const sampleBills = [
      {
        id: '1',
        name: 'Electricity Bill',
        amount: 2450.75,
        due_date: new Date().toISOString().split('T')[0], // Today
        category: 'utilities',
        status: 'unpaid',
        notes: 'Monthly electricity consumption - high usage this month'
      },
      {
        id: '2', 
        name: 'Internet & Cable',
        amount: 1899.00,
        due_date: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], // Tomorrow
        category: 'utilities',
        status: 'unpaid',
        notes: 'Broadband + TV package'
      },
      {
        id: '3',
        name: 'Credit Card Payment',
        amount: 15750.50,
        due_date: new Date().toISOString().split('T')[0], // Today
        category: 'credit_card',
        status: 'unpaid',
        notes: 'Minimum payment due to avoid late fees'
      }
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
    
    const billsDueToday = sampleBills.filter(b => b.due_date === todayStr);
    const billsDueTomorrow = sampleBills.filter(b => b.due_date === tomorrowStr);
    const totalAmount = sampleBills.reduce((sum, bill) => sum + bill.amount, 0);

    // Create professional email content
    let subject = '';
    let content = '';

    if (billsDueToday.length > 0 && billsDueTomorrow.length > 0) {
      subject = `🚨 ${billsDueToday.length + billsDueTomorrow.length} Bills Need Your Immediate Attention`;
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
    }

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
                    Total Amount Due • ${sampleBills.length} Bill${sampleBills.length > 1 ? 's' : ''}
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
                This is a <strong>test email</strong> from InvoiceFlow Bill Reminder System
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                Stay on top of your finances with InvoiceFlow 💪
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send test email
    console.log(`📧 Sending comprehensive test email to ${email}...`);
    
    const emailResponse = await resend.emails.send({
      from: "InvoiceFlow <no-reply@invoiceflow.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log('✅ Comprehensive test email sent successfully:', {
      id: emailResponse.data?.id,
      to: email,
      subject: subject,
      billsIncluded: sampleBills.length,
      totalAmount: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Comprehensive test email sent successfully',
        id: emailResponse.data?.id,
        to: email,
        subject: subject,
        billsProcessed: sampleBills.length,
        totalAmount: totalAmount,
        emailDetails: {
          billsDueToday: billsDueToday.length,
          billsDueTomorrow: billsDueTomorrow.length,
          formattedAmount: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('❌ Comprehensive test email function error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to send comprehensive test email',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);