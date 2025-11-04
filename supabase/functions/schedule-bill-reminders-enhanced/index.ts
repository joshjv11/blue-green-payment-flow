import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleReminderRequest {
  bill_id: string;
  enable_whatsapp_reminders?: boolean;
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

    const { bill_id, enable_whatsapp_reminders = true, user_phone_number }: ScheduleReminderRequest = await req.json();

    if (!bill_id) {
      return new Response(
        JSON.stringify({ error: "bill_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bill
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

    if (!enable_whatsapp_reminders) {
      // Delete existing reminders
      await supabaseClient
        .from("whatsapp_bill_reminders")
        .delete()
        .eq("user_id", user.id)
        .eq("bill_id", bill_id);

      return new Response(
        JSON.stringify({ success: true, message: "WhatsApp reminders disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user_phone_number) {
      return new Response(
        JSON.stringify({ error: "User phone number required for WhatsApp reminders" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dueDate = new Date(bill.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate reminder dates
    const reminder3Days = new Date(dueDate);
    reminder3Days.setDate(reminder3Days.getDate() - 3);
    
    const reminder1Day = new Date(dueDate);
    reminder1Day.setDate(reminder1Day.getDate() - 1);

    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);

    const formattedPhone = formatPhoneNumber(user_phone_number);
    const reminders = [];

    // Create 3-day reminder
    if (reminder3Days >= today) {
      const message = generateReminderMessage(bill, 3, "3_days_before");
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;

      reminders.push({
        user_id: user.id,
        bill_id: bill.id,
        reminder_type: "3_days_before",
        reminder_date: reminder3Days.toISOString().split('T')[0],
        whatsapp_url: whatsappUrl,
        message_content: message,
        status: "pending",
        user_phone_number: formattedPhone,
      });
    }

    // Create 1-day reminder
    if (reminder1Day >= today) {
      const message = generateReminderMessage(bill, 1, "1_day_before");
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;

      reminders.push({
        user_id: user.id,
        bill_id: bill.id,
        reminder_type: "1_day_before",
        reminder_date: reminder1Day.toISOString().split('T')[0],
        whatsapp_url: whatsappUrl,
        message_content: message,
        status: "pending",
        user_phone_number: formattedPhone,
      });
    }

    // Create due date reminder
    if (dueDateOnly >= today) {
      const message = generateReminderMessage(bill, 0, "due_date");
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;

      reminders.push({
        user_id: user.id,
        bill_id: bill.id,
        reminder_type: "due_date",
        reminder_date: dueDateOnly.toISOString().split('T')[0],
        whatsapp_url: whatsappUrl,
        message_content: message,
        status: "pending",
        user_phone_number: formattedPhone,
      });
    }

    // Upsert reminders
    if (reminders.length > 0) {
      const { data, error } = await supabaseClient
        .from("whatsapp_bill_reminders")
        .upsert(reminders, {
          onConflict: "user_id,bill_id,reminder_type",
        })
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to schedule reminders", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Scheduled ${reminders.length} WhatsApp reminder(s)`,
          reminders: data,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "No reminders to schedule (bill due date is in the past)",
        reminders: []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Schedule reminders error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate reminder message
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
  }

  return `${emoji} ${urgency}

${billName} Payment Reminder

Amount: ₹${amount.toFixed(2)}
Due Date: ${dueDate}
Due in: ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}

Please pay to avoid late fees and service disconnection.

Thank you!`;
}

// Format phone number
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
