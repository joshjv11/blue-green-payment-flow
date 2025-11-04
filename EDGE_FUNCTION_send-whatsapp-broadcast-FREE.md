# Edge Function: send-whatsapp-broadcast (FREE - No Twilio)

## Instructions:

1. Go to Supabase Dashboard → **Edge Functions**
2. Find `send-whatsapp-broadcast` and click **"Edit"**
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
    console.log('🚀 Starting WhatsApp broadcast (FREE method)...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const body: BroadcastRequest = await req.json();
    const { broadcastType, message, customerIds = [], manualPhoneNumbers = [] } = body;

    // Get target customers from database
    let customers: any[] = [];
    
    if (customerIds.length > 0) {
      const customersQuery = supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('user_id', user.id)
        .not('phone', 'is', null)
        .in('id', customerIds);

      const { data: dbCustomers, error: customersError } = await customersQuery;

      if (customersError) {
        throw new Error('Failed to fetch customers');
      }

      customers = dbCustomers || [];
    }

    // Add manual phone numbers as "customers"
    manualPhoneNumbers.forEach((phone, index) => {
      if (phone && phone.trim().length >= 10) {
        let formattedPhone = phone.replace(/\s+/g, '').trim();
        // Remove leading zeros
        if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('+')) {
          formattedPhone = formattedPhone.substring(1);
        }
        // Add country code if missing
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone;
        }
        // Validate phone format
        if (/^\+[1-9]\d{1,14}$/.test(formattedPhone)) {
          customers.push({
            id: `manual_${Date.now()}_${index}`,
            name: `Manual ${formattedPhone}`,
            phone: formattedPhone,
            email: null
          });
        } else {
          console.warn(`⚠️ Invalid phone number format: ${phone}`);
        }
      }
    });

    console.log(`📋 Found ${customers.length} recipients for broadcast`);
    console.log(`   - ${customerIds.length} customers from database`);
    console.log(`   - ${manualPhoneNumbers.filter(p => p && p.trim().length >= 10).length} manual phone numbers`);
    
    if (customers.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid recipients found. Please select customers or add phone numbers.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Log all customers for debugging
    customers.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name || 'Unknown'} - Phone: ${c.phone || 'N/A'}`);
    });

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

    let sentCount = 0;
    let failedCount = 0;
    const whatsappLinks: Array<{ phone: string; name: string; url: string }> = [];

    // Generate WhatsApp links for each customer
    console.log(`🔄 Processing ${customers.length} recipients...`);
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      console.log(`📞 Processing recipient ${i + 1}/${customers.length}: ${customer.name || customer.phone}`);
      
      if (!customer.phone) {
        console.warn(`⚠️ Skipping ${customer.name || 'customer'} - no phone number`);
        failedCount++;
        continue;
      }

      let formattedPhone = customer.phone.toString().replace(/\s+/g, '').trim();
      
      // Remove leading zeros
      if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.substring(1);
      }
      
      // Add country code if missing
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }
      
      // Validate phone format
      if (!/^\+[1-9]\d{1,14}$/.test(formattedPhone)) {
        console.warn(`⚠️ Invalid phone format for ${customer.name || customer.phone}: ${formattedPhone}`);
        failedCount++;
        continue;
      }

      try {
        // Personalize message (only if customer has a name from database)
        let personalizedMessage = message;
        if (customer.name && !customer.name.startsWith('Manual ')) {
          personalizedMessage = message
            .replace(/{customer_name}/g, customer.name)
            .replace(/{customer_email}/g, customer.email || '');
        } else {
          // For manual numbers, just remove placeholders
          personalizedMessage = message
            .replace(/{customer_name}/g, '')
            .replace(/{customer_email}/g, '');
        }

        // Generate WhatsApp Web URL
        const encodedMessage = encodeURIComponent(personalizedMessage);
        const phoneForUrl = formattedPhone.replace('+', '');
        const whatsappUrl = `https://wa.me/${phoneForUrl}?text=${encodedMessage}`;
        
        console.log(`✅ Generated link for ${customer.name || formattedPhone}: ${whatsappUrl.substring(0, 50)}...`);

        // Create message record (only if customer_id exists and is not manual)
        if (customer.id && !customer.id.startsWith('manual_')) {
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
              sent_at: new Date().toISOString(),
              direction: 'outgoing'
            });
        } else {
          // For manual numbers, create record without customer_id
          await supabase
            .from('whatsapp_messages')
            .insert({
              user_id: user.id,
              phone_number: formattedPhone,
              message_type: broadcastType,
              message_content: personalizedMessage,
              broadcast_id: broadcast.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
              direction: 'outgoing'
            });
        }

        whatsappLinks.push({
          phone: formattedPhone,
          name: customer.name || `Manual ${formattedPhone}`,
          url: whatsappUrl
        });

        sentCount++;
        console.log(`✅ Link ${sentCount}/${customers.length} generated for ${customer.name || formattedPhone}`);
        console.log(`   Phone: ${formattedPhone}, URL: ${whatsappUrl.substring(0, 80)}...`);

      } catch (error) {
        failedCount++;
        console.error(`❌ Error processing ${customer.name}:`, error);
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

    console.log(`✅ Broadcast completed: ${sentCount} links generated, ${failedCount} failed`);
    console.log(`📊 Total links in response: ${whatsappLinks.length}`);
    
    if (whatsappLinks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No WhatsApp links were generated. Please check phone numbers and try again.',
        sent: 0,
        failed: failedCount
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      broadcast_id: broadcast.id,
      sent: sentCount,
      failed: failedCount,
      whatsappLinks: whatsappLinks, // Ensure ALL links are returned
      totalLinks: whatsappLinks.length,
      message: `${sentCount} WhatsApp links generated. Click "Send to All" to open all WhatsApp windows.`,
      note: 'This is a FREE solution. One click opens WhatsApp for all recipients.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Broadcast error:', error);
    return new Response(JSON.stringify({
      success: false,
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

## How This Works:

1. **Generates WhatsApp Web links** for each customer
2. **Returns all links** in the response
3. **User clicks each link** to send messages
4. **100% FREE** - No API costs!

## Benefits:

- ✅ **100% FREE** - No Twilio, no costs
- ✅ **Works immediately** - No setup needed
- ✅ **Uses your phone** - Direct from WhatsApp
- ✅ **Privacy maintained** - Each message sent from your phone

---

**Note:** This generates multiple WhatsApp Web links. The frontend will need to display these links so users can click them one by one to send messages. This is the simplest free solution for broadcasts!

