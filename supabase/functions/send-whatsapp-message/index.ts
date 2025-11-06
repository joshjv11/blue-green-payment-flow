import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessageRequest {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
  messageType: 'invoice' | 'reminder' | 'payment_link' | 'receipt' | 'broadcast' | 'custom';
  customerId?: string;
  invoiceId?: string;
  billId?: string;
  saleOrderId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting WhatsApp message send...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting: 100 requests per hour per user
    const identifier = getRateLimitIdentifier(user, req);
    const rateLimit = await checkRateLimit(identifier, {
      limit: 100,
      window: "1 h",
      prefix: "whatsapp:send"
    });

    if (!rateLimit.success) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You've exceeded the limit of 100 WhatsApp messages per hour. Please try again later.`,
        reset: rateLimit.reset
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.reset - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset)
        }
      });
    }

    // Get user's WhatsApp phone number from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whatsapp_phone_number')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    }

    // Use user's WhatsApp number if available, otherwise fall back to system number
    const fromPhoneNumber = profile?.whatsapp_phone_number || TWILIO_PHONE_NUMBER;
    
    if (!fromPhoneNumber) {
      return new Response(JSON.stringify({
        success: false,
        error: 'WhatsApp phone number not configured. Please add your WhatsApp number in Settings.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: WhatsAppMessageRequest = await req.json();
    const { phoneNumber, message, mediaUrl, messageType, customerId, invoiceId, billId, saleOrderId } = body;

    // Format phone number for WhatsApp (must include country code with +)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').trim();
    
    // Remove leading zeros
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // If doesn't start with +, add country code
    if (!formattedPhone.startsWith('+')) {
      // Check if it's a 10-digit Indian number
      if (/^[6-9]\d{9}$/.test(formattedPhone)) {
        formattedPhone = '+91' + formattedPhone;
      } else {
        // Default to India for other cases
        formattedPhone = '+91' + formattedPhone;
      }
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid phone number format: ${phoneNumber}. Please include country code (e.g., +91 9876543210)`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create record in database first
    const { data: messageRecord, error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        phone_number: formattedPhone,
        message_type: messageType,
        message_content: message,
        media_url: mediaUrl,
        related_invoice_id: invoiceId,
        related_bill_id: billId,
        related_sale_id: saleOrderId,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error('Failed to create message record');
    }

    console.log('📝 Message record created:', messageRecord.id);

    // Send via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Format the from phone number
    let formattedFromPhone = fromPhoneNumber.replace(/\s+/g, '').trim();
    if (!formattedFromPhone.startsWith('+')) {
      formattedFromPhone = '+91' + formattedFromPhone;
    }

    const twilioBody = new URLSearchParams({
      From: `whatsapp:${formattedFromPhone}`,
      To: `whatsapp:${formattedPhone}`,
      Body: message
    });

    if (mediaUrl) {
      twilioBody.append('MediaUrl', mediaUrl);
    }

    console.log('📤 Sending to Twilio...');

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: twilioBody.toString()
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('❌ Twilio error:', twilioData);
      
      // Update message status to failed
      await supabase
        .from('whatsapp_messages')
        .update({
          status: 'failed',
          error_message: twilioData.message || 'Failed to send message'
        })
        .eq('id', messageRecord.id);

      return new Response(JSON.stringify({
        success: false,
        error: twilioData.message || 'Failed to send WhatsApp message'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Message sent via Twilio:', twilioData.sid);

    // Update message with Twilio SID and status
    await supabase
      .from('whatsapp_messages')
      .update({
        twilio_message_sid: twilioData.sid,
        status: twilioData.status === 'queued' ? 'queued' : 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', messageRecord.id);

    return new Response(JSON.stringify({
      success: true,
      messageId: messageRecord.id,
      twilioSid: twilioData.sid,
      status: twilioData.status
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ WhatsApp message error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred',
      details: 'Failed to send WhatsApp message'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
