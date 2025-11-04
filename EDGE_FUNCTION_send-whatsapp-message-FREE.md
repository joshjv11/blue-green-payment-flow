# Edge Function: send-whatsapp-message (FREE - No Twilio)

## Instructions:

1. Go to Supabase Dashboard → **Edge Functions**
2. Find `send-whatsapp-message` and click **"Edit"**
3. **Replace the entire code** with the code below
4. Click **"Deploy"**

---

## Complete Code (FREE WhatsApp Web Solution):

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
    console.log('🚀 Starting WhatsApp message send (FREE method)...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Get user's WhatsApp phone number from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whatsapp_phone_number')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    }

    const body: WhatsAppMessageRequest = await req.json();
    const { phoneNumber, message, messageType, customerId, invoiceId, billId, saleOrderId } = body;

    // Format phone number (remove spaces, leading zeros, add country code if needed)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').trim();
    
    // Remove leading zeros
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // If doesn't start with +, add country code
    if (!formattedPhone.startsWith('+')) {
      if (/^[6-9]\d{9}$/.test(formattedPhone)) {
        formattedPhone = '+91' + formattedPhone;
      } else {
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

    // Create record in database
    const { data: messageRecord, error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        phone_number: formattedPhone,
        message_type: messageType,
        message_content: message,
        related_invoice_id: invoiceId,
        related_bill_id: billId,
        related_sale_id: saleOrderId,
        status: 'pending',
        direction: 'outgoing'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error('Failed to create message record');
    }

    console.log('📝 Message record created:', messageRecord.id);

    // Generate WhatsApp Web URL (FREE method - no API costs!)
    // This opens WhatsApp Web with pre-filled number and message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;

    // Update message record with WhatsApp URL
    await supabase
      .from('whatsapp_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', messageRecord.id);

    console.log('✅ WhatsApp URL generated:', whatsappUrl);

    return new Response(JSON.stringify({
      success: true,
      messageId: messageRecord.id,
      whatsappUrl: whatsappUrl,
      status: 'sent',
      message: 'WhatsApp link generated successfully. Open it to send the message.',
      note: 'This is a FREE solution using WhatsApp Web. Click the link to send the message from your phone.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ WhatsApp message error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
      details: 'Failed to process WhatsApp message'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
```

---

## How This Works:

1. **No Twilio needed** - 100% FREE
2. **Generates WhatsApp Web link** - Opens WhatsApp with pre-filled message
3. **User clicks link** - Opens on their phone/WhatsApp Web
4. **Message is ready to send** - Just click send button

## Benefits:

- ✅ **100% FREE** - No API costs
- ✅ **Uses your phone number** - Direct from WhatsApp
- ✅ **No setup required** - Works immediately
- ✅ **Privacy maintained** - Messages sent directly from your phone

---

**Note:** This generates a WhatsApp Web link. When the user clicks it, WhatsApp opens with the message pre-filled. They just need to click "Send" on their phone. This is the simplest free solution!

