# WhatsApp Edge Functions Setup Guide

## How to Create/Update Edge Functions in Supabase Dashboard

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Select your project (project ID: `yqzzcvkgeoghirfrflzq`)
3. Go to **Edge Functions** in the left sidebar

---

## Function 1: `send-whatsapp-message`

### Create/Update the Function:

1. **Click "Create a new function"** (or find existing `send-whatsapp-message` and click "Edit")

2. **Function Name:** `send-whatsapp-message`

3. **Paste the complete code below:**

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
```

4. **Click "Deploy"** (or "Save" then "Deploy")

---

## Function 2: `send-whatsapp-broadcast`

### Create/Update the Function:

1. **Click "Create a new function"** (or find existing `send-whatsapp-broadcast` and click "Edit")

2. **Function Name:** `send-whatsapp-broadcast`

3. **Paste the complete code below:**

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

4. **Click "Deploy"** (or "Save" then "Deploy")

---

## Step 2: Set Environment Variables (Secrets)

After creating the functions, you need to set Twilio credentials:

1. Go to **Edge Functions** → **Secrets** (or **Project Settings** → **Edge Functions** → **Secrets**)

2. Add these secrets (if not already present):
   - **Name:** `TWILIO_ACCOUNT_SID` → **Value:** Your Twilio Account SID
   - **Name:** `TWILIO_AUTH_TOKEN` → **Value:** Your Twilio Auth Token
   - **Name:** `TWILIO_PHONE_NUMBER` → **Value:** Your Twilio WhatsApp phone number (e.g., `+14155238886`)

3. Click **"Save"** for each secret

---

## Step 3: Run Database Migration

Make sure the `whatsapp_phone_number` column exists in the `profiles` table:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this SQL:

```sql
-- Add WhatsApp phone number field to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

COMMENT ON COLUMN public.profiles.whatsapp_phone_number IS 'User''s WhatsApp phone number for sending messages (format: +1234567890)';
```

---

## Step 4: Test the Functions

1. Go to your app and try sending a WhatsApp message
2. Check **Edge Functions** → **Logs** to see if there are any errors
3. If you see errors, check:
   - Twilio credentials are set correctly
   - Your WhatsApp number is configured in Settings
   - Database migration was run successfully

---

## ✅ That's It!

Your WhatsApp functions should now work. The functions will:
- Use the user's WhatsApp number from their profile (if set)
- Fall back to the system Twilio number if not set
- Properly format phone numbers
- Send individual private messages
- Support broadcasting to multiple customers

