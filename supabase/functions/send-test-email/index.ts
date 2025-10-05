import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    
    const emailResponse = await resend.emails.send({
      from: "InvoiceFlow <onboarding@resend.dev>",
      to: [email],
      subject: "🧪 Test Email from InvoiceFlow",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">📧 Test Email Success!</h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #334155; margin: 0 0 10px 0;">Hi ${displayName}!</h2>
            <p style="color: #64748b; line-height: 1.6; margin: 0;">
              This is a test email from InvoiceFlow to confirm your email notifications are working correctly. 
              You will receive bill reminders and important updates at this email address.
            </p>
          </div>
          
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #065f46; margin: 0; font-weight: 600;">✅ Email notifications are configured successfully!</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              This is an automated test message from InvoiceFlow.
            </p>
          </div>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully:', {
      id: emailResponse.data?.id,
      to: email,
      from: "InvoiceFlow <onboarding@resend.dev>"
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