# Edge Function: send-whatsapp-broadcast

## Instructions:

1. Go to Supabase Dashboard → **Edge Functions**
2. Click **"Create a new function"** (or find existing `send-whatsapp-broadcast` and click "Edit")
3. **Function Name:** `send-whatsapp-broadcast`
4. **Copy and paste the code below** into the function editor
5. Click **"Deploy"**

---

## Complete Code:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  broadcastType: 'gst_reminder' | 'payment_reminder' | 'custom';
  message: string;
  customerIds?: string[];
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
    const { broadcastType, message, customerIds, filters } = body;

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

    console.log(`📋 Found ${customers.length} customers for broadcast`);

    // Create broadcast record
    const { data: broadcast, error: broadcastError } = await supabase
      .from('whatsapp_broadcasts')
      .insert({
        user_id: user.id,
        broadcast_type: broadcastType,
        message_content: message,
        total_recipients: customers.length,
        status: 'in_progress'
      })
      .select()
      .single();

    if (broadcastError) {
      throw new Error('Failed to create broadcast record');
    }

    console.log('📝 Broadcast record created:', broadcast.id);

    // Send messages to each customer
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      if (!customer.phone) continue;

      let formattedPhone = customer.phone.replace(/\s+/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }

      try {
        // Personalize message
        const personalizedMessage = message
          .replace('{customer_name}', customer.name)
          .replace('{customer_email}', customer.email || '');

        // Format the from phone number
        let formattedFromPhone = fromPhoneNumber.replace(/\s+/g, '').trim();
        if (!formattedFromPhone.startsWith('+')) {
          formattedFromPhone = '+91' + formattedFromPhone;
        }

        const twilioBody = new URLSearchParams({
          From: `whatsapp:${formattedFromPhone}`,
          To: `whatsapp:${formattedPhone}`,
          Body: personalizedMessage
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
          sentCount++;
          
          // Create message record
          await supabase
            .from('whatsapp_messages')
            .insert({
              user_id: user.id,
              customer_id: customer.id,
              phone_number: formattedPhone,
              message_type: broadcastType,
              message_content: personalizedMessage,
              broadcast_id: broadcast.id,
              status: 'sent',
              twilio_message_sid: twilioData.sid,
              sent_at: new Date().toISOString()
            });

          console.log(`✅ Sent to ${customer.name}`);
        } else {
          failedCount++;
          console.error(`❌ Failed to send to ${customer.name}:`, twilioData);
        }

        // Rate limiting - wait 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        failedCount++;
        console.error(`❌ Error sending to ${customer.name}:`, error);
      }
    }

    // Update broadcast record
    await supabase
      .from('whatsapp_broadcasts')
      .update({
        messages_sent: sentCount,
        messages_failed: failedCount,
        status: 'completed',
        sent_at: new Date().toISOString()
      })
      .eq('id', broadcast.id);

    console.log(`✅ Broadcast completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      broadcast_id: broadcast.id,
      sent: sentCount,
      failed: failedCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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
```

---

## Notes:

- This function sends **broadcast messages** to multiple customers at once
- It uses the user's WhatsApp number from their profile (if configured)
- Falls back to system Twilio number if user hasn't set their number
- Personalizes messages with `{customer_name}` and `{customer_email}` placeholders
- Waits 1 second between each message to avoid rate limiting
- Requires Twilio credentials in Supabase Secrets

