import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily cron job to check for invoices >25 days old without IRN
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get invoices >25 days old without IRN
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 25);

    const { data: pendingInvoices, error } = await supabaseClient
      .rpc('get_pending_einvoices_over_30_days', {
        p_user_id: null, // Get for all users
      })
      .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
      .is('irn', null)
      .limit(1000);

    if (error) {
      // Fallback query if RPC doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabaseClient
        .from("sales_orders")
        .select("id, user_id, invoice_number, transaction_date")
        .gte("transaction_date", cutoffDate.toISOString().split('T')[0])
        .is("irn", null)
        .limit(1000);

      if (fallbackError) {
        throw fallbackError;
      }

      const invoices = fallbackData || [];
      const alerts = [];

      for (const invoice of invoices) {
        const daysOld = Math.floor(
          (new Date().getTime() - new Date(invoice.transaction_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOld >= 25) {
          // Create alert
          await supabaseClient
            .from("gst_mismatch_alerts")
            .upsert({
              user_id: invoice.user_id,
              alert_type: "einvoice_30day_warning",
              severity: daysOld >= 28 ? "critical" : "high",
              title: `Invoice ${invoice.invoice_number} needs IRN upload`,
              description: `Invoice is ${daysOld} days old. Upload IRN within ${30 - daysOld} days to avoid ITC loss.`,
              related_invoice_id: invoice.id,
              is_resolved: false,
              created_at: new Date().toISOString(),
            }, {
              onConflict: "user_id,related_invoice_id,alert_type",
            });

          // Send WhatsApp alert if user has phone
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("phone, raw_user_meta_data")
            .eq("id", invoice.user_id)
            .single();

          if (profile?.phone) {
            try {
              await supabaseClient.functions.invoke("send-whatsapp-message", {
                body: {
                  phone_number: profile.phone,
                  message: daysOld >= 28
                    ? `🚨 URGENT: Invoice ${invoice.invoice_number} is ${daysOld} days old. Upload IRN within ${30 - daysOld} days or lose ITC claim!`
                    : `⚠️ Warning: Invoice ${invoice.invoice_number} is ${daysOld} days old. Upload IRN within ${30 - daysOld} days.`,
                },
              });
            } catch (err) {
              console.warn("WhatsApp alert failed:", err);
            }
          }

          alerts.push({
            user_id: invoice.user_id,
            invoice_number: invoice.invoice_number,
            days_old: daysOld,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          checked: invoices.length,
          alerts_created: alerts.length,
          alerts,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: pendingInvoices?.length || 0,
        message: "30-day compliance check completed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("30-day compliance check error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

