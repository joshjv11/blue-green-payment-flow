import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  From: string;
  To: string;
  Body?: string;
  MediaUrl0?: string;
  NumMedia?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Twilio webhook received');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const payload: TwilioWebhookPayload = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string || undefined,
      MediaUrl0: formData.get('MediaUrl0') as string || undefined,
      NumMedia: formData.get('NumMedia') as string || undefined,
    };

    console.log('📦 Webhook payload:', payload);

    // Handle delivery status updates
    if (payload.MessageSid && payload.MessageStatus) {
      const statusMap: Record<string, string> = {
        'queued': 'queued',
        'sending': 'sending',
        'sent': 'sent',
        'delivered': 'delivered',
        'read': 'read',
        'failed': 'failed',
        'undelivered': 'failed'
      };

      const newStatus = statusMap[payload.MessageStatus] || 'pending';

      await supabase
        .from('whatsapp_messages')
        .update({ 
          status: newStatus,
          delivery_status: payload.MessageStatus,
          updated_at: new Date().toISOString()
        })
        .eq('twilio_message_sid', payload.MessageSid);

      console.log(`✅ Updated message ${payload.MessageSid} to status: ${newStatus}`);
    }

    // Handle incoming messages (payment proof, replies)
    if (payload.Body || payload.NumMedia) {
      const phoneNumber = payload.From?.replace('whatsapp:', '');
      
      // Check if this is a reply to a payment link
      const { data: paymentLinks } = await supabase
        .from('payment_links')
        .select('*, whatsapp_messages!inner(*)')
        .eq('whatsapp_messages.phone_number', phoneNumber)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (paymentLinks && paymentLinks.length > 0) {
        const paymentLink = paymentLinks[0];

        // If media is attached (payment proof)
        if (payload.MediaUrl0) {
          console.log('📷 Payment proof received:', payload.MediaUrl0);
          
          await supabase
            .from('payment_links')
            .update({
              payment_proof_url: payload.MediaUrl0,
              status: 'pending_verification',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentLink.id);

          // Create a notification log
          await supabase
            .from('app_logs')
            .insert({
              user_id: paymentLink.user_id,
              level: 'info',
              event: 'payment_proof_received',
              message: 'Customer sent payment proof via WhatsApp',
              context: {
                payment_link_id: paymentLink.id,
                media_url: payload.MediaUrl0,
                customer_phone: phoneNumber
              }
            });

          console.log('✅ Payment proof saved for verification');
        }

        // Store the incoming message
        await supabase
          .from('whatsapp_messages')
          .insert({
            user_id: paymentLink.user_id,
            customer_id: paymentLink.customer_id,
            phone_number: phoneNumber,
            message_type: 'custom',
            message_content: payload.Body || 'Media attachment',
            media_url: payload.MediaUrl0,
            status: 'delivered',
            direction: 'incoming',
            twilio_message_sid: payload.MessageSid
          });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
