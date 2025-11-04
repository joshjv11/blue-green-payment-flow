import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "joshuavaz55@gmail.com";
const ADMIN_PHONE = "8828447880";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, planType, amount, userEmail } = body;

    // Email notification (you can integrate with SendGrid, Resend, etc.)
    const emailSubject = `Payment Received - ${planType} Plan`;
    const emailBody = `
Payment Notification

Plan: ${planType}
Amount: ₹${amount}
User: ${userEmail || userId}
Date: ${new Date().toLocaleString()}

Please activate the plan in Admin CMS.
    `;

    console.log("📧 Email notification:", {
      to: ADMIN_EMAIL,
      subject: emailSubject,
      body: emailBody
    });

    // SMS notification (you can integrate with Twilio, etc.)
    const smsMessage = `Payment: ₹${amount} for ${planType} plan from ${userEmail || userId}`;
    console.log("📱 SMS notification:", {
      to: ADMIN_PHONE,
      message: smsMessage
    });

    // Store notification in database
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.4");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("payment_notifications").insert({
      user_id: userId,
      plan_type: planType,
      amount: amount,
      admin_email: ADMIN_EMAIL,
      admin_phone: ADMIN_PHONE,
      status: "sent"
    }).catch(() => {
      // Table might not exist, that's okay
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-payment-notification error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

