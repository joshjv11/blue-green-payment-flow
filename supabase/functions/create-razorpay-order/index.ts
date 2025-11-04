import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateLinkBody = {
  amount: number; // in INR paise (e.g., 10000 => ₹100.00)
  customer?: {
    name?: string;
    email?: string;
    contact?: string; // +91XXXXXXXXXX
  };
  description?: string;
  reference_id?: string;
  notes?: Record<string, string>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateLinkBody = await req.json();
    if (!body?.amount || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "amount (in paise) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basicAuth = btoa(`${keyId}:${keySecret}`);

    const payload = {
      amount: body.amount,
      currency: "INR",
      description: body.description ?? "Payment",
      reference_id: body.reference_id ?? undefined,
      customer: body.customer ?? undefined,
      notes: body.notes ?? undefined,
      reminder_enable: true,
      accept_partial: false,
      notify: { sms: true, email: !!body?.customer?.email },
    };

    const res = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Razorpay error:", data);
      return new Response(JSON.stringify({ success: false, error: data?.error || data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, linkId: data?.id, shortUrl: data?.short_url, raw: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-razorpay-order error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


