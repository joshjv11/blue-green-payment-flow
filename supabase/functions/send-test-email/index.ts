import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { testFooter } from "../_shared/emailFooter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      service: 'send-test-email',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('📧 Processing test email request...');

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ Resend API key not configured');
      throw new Error('Resend API key not configured');
    }

    const resend = new Resend(resendApiKey);

    // Parse request body
    const { email, name } = await req.json();

    if (!email) {
      throw new Error('Email address is required for test email');
    }

    const displayName = name || email.split('@')[0];

    // Send test email
    console.log(`📧 Sending test email to ${email}...`);
    
    // Get FROM email from env or use default
    const fromEmail = Deno.env.get('RESEND_FROM') || 'InvoiceFlow <no-reply@invoiceflow.dev>';

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "🧪 Test Email - Delivery Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <h1 style="color: #2563eb; text-align: center; margin-bottom: 20px;">📧 Test Email Delivered Successfully</h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h2 style="color: #334155; margin: 0 0 10px 0;">Hi ${displayName}!</h2>
            <p style="color: #64748b; line-height: 1.6; margin: 0;">
              This is a test email to confirm your notification settings are configured correctly. 
              You will receive bill reminders and important updates at this email address.
            </p>
          </div>
          
          <div style="background: #ecfdf5; border: 2px solid #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #065f46; margin: 0; font-weight: 600; text-align: center;">✅ Email delivery confirmed</p>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #0369a1; margin: 0; font-size: 14px;">
              <strong>What happens next?</strong><br>
              When your bills are due, you'll receive automated reminders at this email address with bill details and due dates.
            </p>
          </div>
          
          ${testFooter}
        </div>
      `,
    });

    console.log('✅ Test email sent successfully:', {
      id: emailResponse.data?.id,
      to: email,
      from: fromEmail
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        id: emailResponse.data?.id,
        to: email
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('❌ Test email function error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to send test email',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);