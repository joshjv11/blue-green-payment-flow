# Edge Function: send-whatsapp-message (FREE - No Twilio) - FIXED VERSION

## Instructions:

1. Go to Supabase Dashboard → **Edge Functions**
2. Find `send-whatsapp-message` and click **"Edit"**
3. **Replace the entire code** with the code below
4. Click **"Deploy"**

---

## Complete Code (Fixed - Better Error Handling):

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
      console.error('❌ No authorization header');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No authorization header' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Invalid token:', userError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    let body: WhatsAppMessageRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { phoneNumber, message, messageType, customerId, invoiceId, billId, saleOrderId } = body;

    // Validate required fields
    if (!phoneNumber || !phoneNumber.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Phone number is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    console.log('📱 Formatted phone:', formattedPhone);

    // Create record in database (try without direction column first, then with it)
    let messageRecord;
    let dbError;
    
    // Try inserting with all fields
    const insertData: any = {
      user_id: user.id,
      phone_number: formattedPhone,
      message_type: messageType || 'custom',
      message_content: message,
      status: 'pending'
    };

    // Add optional fields only if they exist AND are valid
    // Check foreign keys exist before adding them to avoid constraint violations
    if (customerId) {
      const { data: customerCheck } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single();
      if (customerCheck) insertData.customer_id = customerId;
    }
    
    if (invoiceId) {
      const { data: invoiceCheck } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .single();
      if (invoiceCheck) insertData.related_invoice_id = invoiceId;
    }
    
    if (billId) {
      const { data: billCheck } = await supabase
        .from('bills')
        .select('id')
        .eq('id', billId)
        .eq('user_id', user.id)
        .single();
      if (billCheck) insertData.related_bill_id = billId;
    }
    
    if (saleOrderId) {
      const { data: saleCheck } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('id', saleOrderId)
        .eq('user_id', user.id)
        .single();
      if (saleCheck) insertData.related_sale_id = saleOrderId;
    }

    // Try to insert with direction column (if it exists)
    const { data: recordWithDirection, error: errorWithDirection } = await supabase
      .from('whatsapp_messages')
      .insert({
        ...insertData,
        direction: 'outgoing'
      })
      .select()
      .single();

    if (errorWithDirection) {
      // If direction column doesn't exist, try without it
      console.log('⚠️ Direction column may not exist, trying without it...');
      const { data: recordWithout, error: errorWithout } = await supabase
        .from('whatsapp_messages')
        .insert(insertData)
        .select()
        .single();
      
      if (errorWithout) {
        console.error('❌ Database error:', errorWithout);
        dbError = errorWithout;
      } else {
        messageRecord = recordWithout;
      }
    } else {
      messageRecord = recordWithDirection;
    }

    if (dbError || !messageRecord) {
      console.error('❌ Database error:', dbError);
      return new Response(JSON.stringify({
        success: false,
        error: dbError?.message || 'Failed to create message record',
        details: 'Please make sure the whatsapp_messages table exists and has the required columns'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📝 Message record created:', messageRecord.id);

    // Generate WhatsApp Web URL (FREE method - no API costs!)
    const encodedMessage = encodeURIComponent(message);
    const phoneForUrl = formattedPhone.replace('+', '');
    const whatsappUrl = `https://wa.me/${phoneForUrl}?text=${encodedMessage}`;

    console.log('🔗 Generated WhatsApp URL:', whatsappUrl);

    // Try to update message record (ignore errors if update fails)
    try {
      await supabase
        .from('whatsapp_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', messageRecord.id);
    } catch (updateError) {
      console.warn('⚠️ Could not update message status (non-critical):', updateError);
    }

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
      details: 'Failed to process WhatsApp message',
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
```

---

## Key Fixes:

1. ✅ **Better error handling** - All errors return proper JSON with `success: false`
2. ✅ **Handles missing columns** - Tries with `direction` column, falls back without it
3. ✅ **Better validation** - Checks for required fields before processing
4. ✅ **Improved logging** - More console logs to debug issues
5. ✅ **Non-critical updates** - Update status errors won't break the function

---

## If Still Getting Errors:

Check Supabase Edge Functions logs:
1. Go to **Edge Functions** → **send-whatsapp-message** → **Logs**
2. Look for the error message
3. Share the error with me and I'll fix it

