import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

async function verifySignature(bodyText: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sigBuf = new TextEncoder().encode(signature);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyText));
  const macHex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return macHex === signature; // Razorpay sends hex digest
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) {
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const bodyText = await req.text();
    const sig = req.headers.get("X-Razorpay-Signature") || req.headers.get("x-razorpay-signature") || "";

    const verified = await verifySignature(bodyText, sig, secret);
    if (!verified) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(bodyText);
    console.log("Razorpay webhook event:", event);

    // Handle payment success
    if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
      const paymentData = event.payload?.payment_link?.entity || event.payload?.payment?.entity;
      const amount = paymentData?.amount ? paymentData.amount / 100 : 0; // Convert paise to rupees
      const referenceId = paymentData?.reference_id || '';
      const customerEmail = paymentData?.customer?.email || '';
      
      // Extract plan from reference_id (format: "pro-{userId}-{timestamp}" or "premium-{userId}-{timestamp}")
      const planMatch = referenceId.match(/^(pro|premium)-/);
      const planType = planMatch ? planMatch[1] : null;
      const userId = referenceId.split('-')[1];

      if (planType && userId) {
        // Update user plan
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabaseClient
          .from('user_plans')
          .upsert({
            user_id: userId,
            plan: planType,
            is_active: true,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            ai_queries_limit: planType === 'free' ? 3 : 999999,
          }, {
            onConflict: 'user_id'
          });

        // Send notification to admin
        const ADMIN_EMAIL = "joshuavaz55@gmail.com";
        const ADMIN_PHONE = "8828447880";
        
        console.log("📧 Email notification to admin:", {
          to: ADMIN_EMAIL,
          subject: `Payment Received - ${planType} Plan`,
          body: `Payment of ₹${amount} received for ${planType} plan.\nUser: ${customerEmail || userId}\nTime: ${new Date().toLocaleString()}`
        });

        console.log("📱 SMS notification to admin:", {
          to: ADMIN_PHONE,
          message: `Payment: ₹${amount} for ${planType} plan from ${customerEmail || userId}`
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("razorpay-webhook error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


