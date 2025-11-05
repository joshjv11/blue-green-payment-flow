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

  try {
    console.log('📧 Processing broadcast email request...');

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ Resend API key not configured');
      throw new Error('Resend API key not configured');
    }

    const resend = new Resend(resendApiKey);

    // Parse request body
    const { to, from, subject, html, text } = await req.json();

    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required fields: to, subject, and html/text');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error('Invalid email address');
    }

    // Use provided from email or default
    let fromEmail = from || Deno.env.get('RESEND_FROM') || 'InvoiceFlow <no-reply@invoiceflow.dev>';
    
    // If using a personal Gmail, it needs to be verified in Resend
    // For now, if it's a Gmail address, use a default instead with a note
    if (fromEmail.includes('@gmail.com') && !fromEmail.includes('InvoiceFlow')) {
      // Gmail addresses typically can't be used unless verified domain
      // Use default but log the attempt
      console.warn('⚠️ Personal Gmail address detected. Using default from address instead.');
      fromEmail = Deno.env.get('RESEND_FROM') || 'InvoiceFlow <no-reply@invoiceflow.dev>';
    }

    console.log(`📧 Sending email from: ${fromEmail} to: ${to}`);

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html || text?.replace(/\n/g, '<br>'),
      text: text || html?.replace(/<[^>]*>/g, ''),
    });

    if (emailResponse.error) {
      // Provide more detailed error information
      const errorMessage = emailResponse.error.message || 'Unknown Resend API error';
      const errorDetails = {
        message: errorMessage,
        name: emailResponse.error.name || 'ResendError',
        ...(emailResponse.error as any),
      };
      console.error('❌ Resend API error:', errorDetails);
      throw new Error(`Resend API Error: ${errorMessage}`);
    }

    console.log('✅ Broadcast email sent successfully:', {
      id: emailResponse.data?.id,
      to: to,
      from: fromEmail
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        id: emailResponse.data?.id,
        to: to
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('❌ Broadcast email function error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: 'Failed to send broadcast email',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);

