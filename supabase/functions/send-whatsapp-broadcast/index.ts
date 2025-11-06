import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Background function to process broadcast queue
 * Handles large broadcasts without timing out
 */
async function processBroadcastQueue(
  supabase: any,
  broadcastId: string,
  messageQueue: Array<{
    customer: any;
    formattedPhone: string;
    personalizedMessage: string;
    waUrl: string;
    formattedFromPhone: string;
  }>,
  twilioUrl: string,
  twilioAuth: string,
  userId: string,
  broadcastType: string
) {
  let sentCount = 0;
  let failedCount = 0;
  const batchSize = 10; // Process 10 messages at a time

  for (let i = 0; i < messageQueue.length; i += batchSize) {
    const batch = messageQueue.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const twilioBody = new URLSearchParams({
          From: `whatsapp:${item.formattedFromPhone}`,
          To: `whatsapp:${item.formattedPhone}`,
          Body: item.personalizedMessage
        });

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: twilioBody.toString()
        });

        const twilioData = await twilioResponse.json();

        if (twilioResponse.ok) {
          const insertPayload: Record<string, unknown> = {
            user_id: userId,
            phone_number: item.formattedPhone,
            message_type: broadcastType,
            message_content: item.personalizedMessage,
            broadcast_id: broadcastId,
            status: 'sent',
            twilio_message_sid: twilioData.sid,
            sent_at: new Date().toISOString()
          };
          if (item.customer.id) insertPayload.customer_id = item.customer.id;

          await supabase.from('whatsapp_messages').insert(insertPayload);
          return { success: true };
        } else {
          console.error(`❌ Failed to send to ${item.customer.name}:`, twilioData);
          return { success: false };
        }
      } catch (error) {
        console.error(`❌ Error sending to ${item.customer.name}:`, error);
        return { success: false };
      }
    });

    const results = await Promise.all(batchPromises);
    results.forEach(r => r.success ? sentCount++ : failedCount++);

    // Update progress every batch
    await supabase
      .from('whatsapp_broadcasts')
      .update({
        messages_sent: sentCount,
        messages_failed: failedCount,
        status: 'in_progress'
      })
      .eq('id', broadcastId);

    // Rate limiting: 500ms between batches
    if (i + batchSize < messageQueue.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Final update
  await supabase
    .from('whatsapp_broadcasts')
    .update({
      messages_sent: sentCount,
      messages_failed: failedCount,
      status: 'completed',
      sent_at: new Date().toISOString()
    })
    .eq('id', broadcastId);

  console.log(`✅ Background broadcast completed: ${sentCount} sent, ${failedCount} failed`);
}

interface BroadcastRequest {
  broadcastType: 'gst_reminder' | 'payment_reminder' | 'custom';
  message: string;
  customerIds?: string[];
  manualPhoneNumbers?: string[];
  filters?: {
    hasUnpaidInvoices?: boolean;
    gstFilingDue?: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting WhatsApp broadcast...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

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

    // Rate limiting: 10 broadcasts per hour per user (more restrictive)
    const identifier = getRateLimitIdentifier(user, req);
    const rateLimit = await checkRateLimit(identifier, {
      limit: 10,
      window: "1 h",
      prefix: "whatsapp:broadcast"
    });

    if (!rateLimit.success) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You've exceeded the limit of 10 WhatsApp broadcasts per hour. Please try again later.`,
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

    const body: BroadcastRequest = await req.json();
    const { broadcastType, message, customerIds, manualPhoneNumbers = [], filters } = body;

    // Get target customers
    let customersQuery = supabase
      .from('customers')
      .select('id, name, phone, email')
      .eq('user_id', user.id)
      .not('phone', 'is', null);

    if (customerIds && customerIds.length > 0) {
      customersQuery = customersQuery.in('id', customerIds);
    }

    const { data: customers, error: customersError } = await customersQuery;

    if (customersError || !customers) {
      throw new Error('Failed to fetch customers');
    }

    console.log(`📋 Found ${customers.length} customers from database`);

    // Prepare manual recipients
    const sanitizePhone = (input: string) => (input || '').replace(/\s+/g, '').trim();
    const formatToE164 = (phone: string) => {
      let p = sanitizePhone(phone);
      if (!p) return '';
      if (p.startsWith('+')) return p;
      // Basic handling for India default if 10 digits
      if (/^\d{10}$/.test(p)) return `+91${p}`;
      // If leading 0 with 10-14 digits, strip the 0
      if (/^0\d{10,14}$/.test(p)) return `+${p.substring(1)}`;
      return `+${p}`; // last resort
    };
    const isValidE164 = (p: string) => /^\+[1-9]\d{1,14}$/.test(p);

    const manualRecipients = manualPhoneNumbers
      .map(formatToE164)
      .filter((p) => {
        const ok = isValidE164(p);
        if (!ok) console.warn('⚠️ Skipping invalid manual phone number:', p);
        return ok;
      })
      .map((p) => ({ id: null as string | null, name: p, phone: p, email: null as string | null }));

    // Combine DB customers and manual recipients
    const recipients = [
      ...customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email })),
      ...manualRecipients,
    ];
    console.log(`👥 Total recipients: ${recipients.length} (db: ${customers.length}, manual: ${manualRecipients.length})`);

    // Create broadcast record
    const { data: broadcast, error: broadcastError } = await supabase
      .from('whatsapp_broadcasts')
      .insert({
        user_id: user.id,
        broadcast_type: broadcastType,
        message_content: message,
        total_recipients: recipients.length,
        status: 'in_progress'
      })
      .select()
      .single();

    if (broadcastError) {
      throw new Error('Failed to create broadcast record');
    }

    console.log('📝 Broadcast record created:', broadcast.id);

    // OPTIMIZATION: Queue messages for async processing to prevent timeouts
    // For large broadcasts (>50 recipients), return immediately and process in background
    const isLargeBroadcast = recipients.length > 50;
    
    if (isLargeBroadcast) {
      // Queue messages for background processing
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      
      // Prepare all messages upfront
      const messageQueue = recipients
        .filter(c => c.phone)
        .map(customer => {
          let formattedPhone = customer.phone.replace(/\s+/g, '');
          if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone;
          }
          
          const personalizedMessage = message
            .replace('{customer_name}', customer.name || '')
            .replace('{customer_email}', customer.email || '');
          
          const digitsOnly = formattedPhone.replace(/\D/g, '');
          const waUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(personalizedMessage)}`;
          
          let formattedFromPhone = fromPhoneNumber.replace(/\s+/g, '').trim();
          if (!formattedFromPhone.startsWith('+')) {
            formattedFromPhone = '+91' + formattedFromPhone;
          }
          
          return {
            customer,
            formattedPhone,
            personalizedMessage,
            waUrl,
            formattedFromPhone
          };
        });

      // Start background processing (don't await - return immediately)
      processBroadcastQueue(
        supabase,
        broadcast.id,
        messageQueue,
        twilioUrl,
        twilioAuth,
        user.id,
        broadcastType
      ).catch(err => {
        console.error('❌ Background broadcast processing error:', err);
        // Update broadcast status to failed
        supabase
          .from('whatsapp_broadcasts')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', broadcast.id)
          .catch(console.error);
      });

      // Return immediately with queued status
      const whatsappLinks = messageQueue.map(m => ({
        name: m.customer.name,
        phone: m.formattedPhone,
        url: m.waUrl
      }));

      return new Response(JSON.stringify({
        success: true,
        broadcast_id: broadcast.id,
        status: 'queued',
        message: `Broadcast queued for ${recipients.length} recipients. Processing in background...`,
        sent: 0,
        failed: 0,
        whatsappLinks,
        totalLinks: whatsappLinks.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Small broadcasts (≤50): Still use background processing to prevent timeouts
    // Edge functions have 60s timeout, so even 50 messages with 1s delay = 50s+ (risky)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    // Prepare message queue
    const messageQueue = recipients
      .filter(c => c.phone)
      .map(customer => {
        let formattedPhone = customer.phone.replace(/\s+/g, '');
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone;
        }
        
        const personalizedMessage = message
          .replace('{customer_name}', customer.name || '')
          .replace('{customer_email}', customer.email || '');
        
        const digitsOnly = formattedPhone.replace(/\D/g, '');
        const waUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(personalizedMessage)}`;
        
        let formattedFromPhone = fromPhoneNumber.replace(/\s+/g, '').trim();
        if (!formattedFromPhone.startsWith('+')) {
          formattedFromPhone = '+91' + formattedFromPhone;
        }
        
        return {
          customer,
          formattedPhone,
          personalizedMessage,
          waUrl,
          formattedFromPhone
        };
      });

    // Always use background processing to prevent timeouts
    processBroadcastQueue(
      supabase,
      broadcast.id,
      messageQueue,
      twilioUrl,
      twilioAuth,
      user.id,
      broadcastType
    ).catch(err => {
      console.error('❌ Background broadcast processing error:', err);
      supabase
        .from('whatsapp_broadcasts')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', broadcast.id)
        .catch(console.error);
    });

    // Return immediately
    const whatsappLinks = messageQueue.map(m => ({
      name: m.customer.name,
      phone: m.formattedPhone,
      url: m.waUrl
    }));

    return new Response(JSON.stringify({
      success: true,
      broadcast_id: broadcast.id,
      status: 'queued',
      message: `Broadcast queued for ${recipients.length} recipients. Processing in background...`,
      sent: 0,
      failed: 0,
      whatsappLinks,
      totalLinks: whatsappLinks.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // All broadcasts now use background processing to prevent timeouts
    // (Code removed - already returned above)

  } catch (error: any) {
    console.error('❌ Broadcast error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred',
      details: 'Failed to send broadcast'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
