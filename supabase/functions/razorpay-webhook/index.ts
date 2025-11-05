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
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      const amountPaise = paymentLinkEntity?.amount || paymentEntity?.amount || 0;
      const amount = amountPaise ? amountPaise / 100 : 0; // Convert paise to rupees
      const referenceId = paymentLinkEntity?.reference_id || paymentEntity?.notes?.reference_id || '';
      const razorpayLinkId = paymentLinkEntity?.id || paymentEntity?.payment_link_id || '';

      // Try to find our payment_links record via provider reference id
      let paymentLinkRecord = null;
      if (razorpayLinkId) {
        const { data: link, error: linkErr } = await supabaseClient
          .from('payment_links')
          .select('*')
          .eq('payment_reference', razorpayLinkId)
          .maybeSingle();
        if (!linkErr) paymentLinkRecord = link;
      }

      // Fallback: try by referenceId if we encoded it in reference_id
      if (!paymentLinkRecord && referenceId) {
        const { data: link2 } = await supabaseClient
          .from('payment_links')
          .select('*')
          .eq('notes', referenceId)
          .maybeSingle();
        if (link2) paymentLinkRecord = link2;
      }

      const userId = paymentLinkRecord?.user_id || (referenceId?.split('-')[1] || null);

      // Insert/Update payment_transactions
      if (userId) {
        await supabaseClient
          .from('payment_transactions')
          .insert({
            user_id: userId,
            amount,
            status: 'verified',
            transaction_id: paymentEntity?.id || razorpayLinkId,
            notes: `Razorpay webhook ${event.event}`,
            created_at: new Date().toISOString(),
          });
      }

      // Mark payment link as paid
      if (paymentLinkRecord?.id) {
        await supabaseClient
          .from('payment_links')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentLinkRecord.id);
      }

      // Optional: Activate plan if purchase reference encodes plan
      const planMatch = referenceId?.match(/^(pro|premium)-/);
      const planType = planMatch ? planMatch[1] : null;
      if (planType && userId) {
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


