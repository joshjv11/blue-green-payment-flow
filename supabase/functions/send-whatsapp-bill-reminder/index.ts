import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppReminderRequest {
  reminder_id?: string;
  bill_id?: string;
  user_phone_number?: string;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reminder_id, bill_id, user_phone_number }: WhatsAppReminderRequest = await req.json() || {};

    // If reminder_id provided, fetch and send that reminder
    if (reminder_id) {
      const { data: reminder, error: reminderError } = await supabaseClient
        .from("whatsapp_bill_reminders")
        .select("*, bills(*)")
        .eq("id", reminder_id)
        .eq("user_id", user.id)
        .single();

      if (reminderError || !reminder) {
        return new Response(
          JSON.stringify({ error: "Reminder not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update status to sent
      await supabaseClient
        .from("whatsapp_bill_reminders")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", reminder_id);

      return new Response(
        JSON.stringify({
          success: true,
          whatsapp_url: reminder.whatsapp_url,
          message: "WhatsApp reminder link generated. Click to send.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If bill_id provided, generate reminder for that bill
    if (bill_id) {
      const { data: bill, error: billError } = await supabaseClient
        .from("bills")
        .select("*")
        .eq("id", bill_id)
        .eq("user_id", user.id)
        .single();

      if (billError || !bill) {
        return new Response(
          JSON.stringify({ error: "Bill not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!user_phone_number) {
        return new Response(
          JSON.stringify({ error: "User phone number required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate days until due
      const dueDate = new Date(bill.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine reminder type
      let reminderType = "due_date";
      if (daysUntilDue === 3) reminderType = "3_days_before";
      else if (daysUntilDue === 1) reminderType = "1_day_before";
      else if (daysUntilDue < 0) reminderType = "overdue";

      // Generate reminder message
      const message = generateReminderMessage(bill, daysUntilDue, reminderType);

      // Generate WhatsApp URL (FREE - wa.me link)
      const formattedPhone = formatPhoneNumber(user_phone_number);
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;

      // Save reminder to database
      const { data: savedReminder, error: saveError } = await supabaseClient
        .from("whatsapp_bill_reminders")
        .upsert({
          user_id: user.id,
          bill_id: bill.id,
          reminder_type: reminderType,
          reminder_date: dueDate.toISOString().split('T')[0],
          whatsapp_url: whatsappUrl,
          message_content: message,
          status: "pending",
          user_phone_number: formattedPhone,
        }, {
          onConflict: "user_id,bill_id,reminder_type",
        })
        .select()
        .single();

      if (saveError) {
        return new Response(
          JSON.stringify({ error: "Failed to save reminder", details: saveError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          reminder_id: savedReminder.id,
          whatsapp_url: whatsappUrl,
          message: "WhatsApp reminder link generated. Click to send.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Either reminder_id or bill_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("WhatsApp reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate reminder message based on urgency
function generateReminderMessage(bill: any, daysUntilDue: number, reminderType: string): string {
  const billName = bill.name || "Bill";
  const amount = bill.amount || 0;
  const dueDate = new Date(bill.due_date).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  let emoji = "📋";
  let urgency = "";

  if (reminderType === "3_days_before") {
    emoji = "⏰";
    urgency = "Gentle Reminder";
  } else if (reminderType === "1_day_before") {
    emoji = "⚠️";
    urgency = "Important Reminder";
  } else if (reminderType === "due_date") {
    emoji = "🚨";
    urgency = "URGENT - Due Today!";
  } else if (reminderType === "overdue") {
    emoji = "🔴";
    urgency = "OVERDUE - Please Pay Immediately";
  }

  return `${emoji} ${urgency}

${billName} Payment Reminder

Amount: ₹${amount.toFixed(2)}
Due Date: ${dueDate}
${daysUntilDue < 0 ? `Overdue by: ${Math.abs(daysUntilDue)} days` : `Due in: ${daysUntilDue} days`}

Please pay to avoid late fees and service disconnection.

Thank you!`;
}

// Format phone number (add +91 if Indian number)
function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\s+/g, '');
  if (!formatted.startsWith('+')) {
    if (/^[6-9]\d{9}$/.test(formatted)) {
      formatted = '+91' + formatted;
    } else {
      formatted = '+91' + formatted;
    }
  }
  return formatted;
}
