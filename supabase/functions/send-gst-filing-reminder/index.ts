import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FilingReminder {
  user_id: string;
  gstin: string;
  filing_type: 'gstr1' | 'gstr3b';
  due_date: string;
  days_until_due: number;
  phone_number?: string;
  user_locale?: 'en-IN' | 'hi-IN';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current date
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // GSTR-1 is due on 11th of next month
    // GSTR-3B is due on 20th of next month
    const gstr1DueDate = new Date(currentYear, currentMonth, 11);
    const gstr3bDueDate = new Date(currentYear, currentMonth, 20);

    // Calculate days until due
    const daysUntilGSTR1 = Math.ceil((gstr1DueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilGSTR3B = Math.ceil((gstr3bDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch all Premium users with GSTN credentials
    const { data: users, error: usersError } = await supabaseClient
      .from("user_plans")
      .select(`
        user_id,
        users!inner (
          id,
          phone,
          raw_user_meta_data
        ),
        gstn_credentials!inner (
          gstin,
          is_active
        )
      `)
      .eq("plan", "premium")
      .eq("is_active", true)
      .eq("gstn_credentials.is_active", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reminders: FilingReminder[] = [];
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromPhone = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromPhone) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check GSTR-1 reminders (3 days and 1 day before)
    if (daysUntilGSTR1 === 3 || daysUntilGSTR1 === 1) {
      for (const user of users) {
        reminders.push({
          user_id: user.user_id,
          gstin: user.gstin!,
          filing_type: 'gstr1',
          due_date: gstr1DueDate.toISOString().split('T')[0],
          days_until_due: daysUntilGSTR1,
          phone_number: user.phone!,
          user_locale: user.locale as 'en-IN' | 'hi-IN',
        });
      }
    }

    // Check GSTR-3B reminders (3 days and 1 day before)
    if (daysUntilGSTR3B === 3 || daysUntilGSTR3B === 1) {
      for (const user of users) {
        reminders.push({
          user_id: user.user_id,
          gstin: user.gstin!,
          filing_type: 'gstr3b',
          due_date: gstr3bDueDate.toISOString().split('T')[0],
          days_until_due: daysUntilGSTR3B,
          phone_number: user.phone!,
          user_locale: user.locale as 'en-IN' | 'hi-IN',
        });
      }
    }

    // Send WhatsApp reminders with voice messages for Hindi users
    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of reminders) {
      try {
        const message = generateReminderMessage(reminder);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        let formattedPhone = reminder.phone_number!.replace(/\s+/g, '');
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone;
        }

        // Send text message
        const twilioBody = new URLSearchParams({
          From: `whatsapp:${twilioFromPhone}`,
          To: `whatsapp:${formattedPhone}`,
          Body: message,
        });

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: twilioBody.toString()
        });

        if (twilioResponse.ok) {
          const twilioData = await twilioResponse.json();
          
          // Log reminder sent
          await supabaseClient
            .from('whatsapp_messages')
            .insert({
              user_id: reminder.user_id,
              phone_number: formattedPhone,
              message_type: 'gst_filing_reminder',
              message_content: message,
              status: 'sent',
              twilio_message_sid: twilioData.sid,
              sent_at: new Date().toISOString(),
            });

          // Send voice message for Hindi users (1 day before only)
          if (reminder.user_locale === 'hi-IN' && reminder.days_until_due === 1) {
            try {
              const voiceMessage = generateVoiceMessage(reminder);
              // Use Twilio Voice API or text-to-speech service
              // For now, send a follow-up message with voice instructions
              const voiceBody = new URLSearchParams({
                From: `whatsapp:${twilioFromPhone}`,
                To: `whatsapp:${formattedPhone}`,
                Body: voiceMessage,
              });

              await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${twilioAuth}`,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: voiceBody.toString()
              });
            } catch (voiceError) {
              console.warn('Voice message failed, continuing with text only:', voiceError);
            }
          }

          sentCount++;
        } else {
          console.error(`Failed to send reminder to ${reminder.phone_number}:`, await twilioResponse.text());
          failedCount++;
        }
      } catch (error) {
        console.error(`Error sending reminder to ${reminder.phone_number}:`, error);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: reminders.length,
        message: `Sent ${sentCount} GST filing reminders`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("GST filing reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateReminderMessage(reminder: FilingReminder): string {
  const filingName = reminder.filing_type === 'gstr1' ? 'GSTR-1' : 'GSTR-3B';
  const dueDate = new Date(reminder.due_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (reminder.user_locale === 'hi-IN') {
    if (reminder.days_until_due === 3) {
      return `नमस्ते सर/मैडम,

आपका ${filingName} ${dueDate} को देय है।

कृपया समय पर फाइल करें ताकि ₹200 का जुर्माना न लगे।

InvoiceFlow से वन-क्लिक फाइलिंग करें: https://invoiceflow.com/gst

धन्यवाद,
InvoiceFlow Team`;
    } else if (reminder.days_until_due === 1) {
      return `🚨 जरूरी: ${filingName} आज फाइल करें!

सर/मैडम, आपका ${filingName} कल (${dueDate}) देय है।

⚠️ आज फाइल करें और ₹200 का जुर्माना बचाएं।

InvoiceFlow से अभी फाइल करें: https://invoiceflow.com/gst

InvoiceFlow Team`;
    }
  } else {
    if (reminder.days_until_due === 3) {
      return `Hello Sir/Madam,

Your ${filingName} is due on ${dueDate}.

Please file on time to avoid ₹200 penalty.

File with one-click: https://invoiceflow.com/gst

Thank you,
InvoiceFlow Team`;
    } else if (reminder.days_until_due === 1) {
      return `🚨 URGENT: File ${filingName} today!

Sir/Madam, your ${filingName} is due tomorrow (${dueDate}).

⚠️ File today to avoid ₹200 penalty.

File now: https://invoiceflow.com/gst

InvoiceFlow Team`;
    }
  }

  return `Reminder: ${filingName} due on ${dueDate}`;
}

function generateVoiceMessage(reminder: FilingReminder): string {
  const filingName = reminder.filing_type === 'gstr1' ? 'GSTR-1' : 'GSTR-3B';
  const dueDate = new Date(reminder.due_date).toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'long',
  });

  if (reminder.user_locale === 'hi-IN') {
    return `🎤 वॉइस मैसेज:

नमस्ते, यह InvoiceFlow से है।

आपका ${filingName} कल ${dueDate} को देय है।

कृपया आज ही फाइल करें और ₹200 का जुर्माना बचाएं।

InvoiceFlow.com/gst पर जाएं और वन-क्लिक फाइलिंग करें।

धन्यवाद।`;
  }

  return `Voice message: Your ${filingName} is due tomorrow. Please file today to avoid penalty.`;
}

