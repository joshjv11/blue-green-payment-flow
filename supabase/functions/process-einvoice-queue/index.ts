import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process E-Invoice queue - handles 50+ invoices/minute
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending invoices from queue (limit 50 per batch)
    const { data: queueItems, error: queueError } = await supabaseClient
      .from("einvoice_queue")
      .select(`
        *,
        sales_orders!inner (
          id,
          user_id,
          invoice_number,
          transaction_date,
          grand_total,
          tax_amount,
          customer_name,
          customer_gstin
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (queueError) {
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending invoices in queue", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process invoices in parallel batches (10 at a time)
    const batchSize = 10;
    for (let i = 0; i < queueItems.length; i += batchSize) {
      const batch = queueItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          // Update status to processing
          await supabaseClient
            .from("einvoice_queue")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .eq("id", item.id);

          // Get GSTN credentials
          const { data: credentials } = await supabaseClient
            .from("gstn_credentials")
            .select("*")
            .eq("user_id", item.sales_orders.user_id)
            .eq("is_active", true)
            .single();

          if (!credentials) {
            throw new Error("GSTN credentials not found");
          }

          // Decrypt password
          const { data: decryptedPassword } = await supabaseClient.rpc(
            'decrypt_gstn_password',
            {
              encrypted_password: credentials.password_encrypted,
              user_id: item.sales_orders.user_id,
            }
          );

          // Generate IRN
          const generateResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-einvoice`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sales_order_id: item.sales_orders.id,
                auto_generate_irn: true,
              }),
            }
          );

          if (!generateResponse.ok) {
            const errorData = await generateResponse.json();
            throw new Error(errorData.error || "IRN generation failed");
          }

          const { irn, ack_no } = await generateResponse.json();

          // Update queue item
          await supabaseClient
            .from("einvoice_queue")
            .update({
              status: "completed",
              irn: irn,
              ack_no: ack_no,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          // Update sales order with IRN
          await supabaseClient
            .from("sales_orders")
            .update({ irn: irn })
            .eq("id", item.sales_orders.id);

          succeeded++;
          return { success: true, item_id: item.id, irn };
        } catch (error: any) {
          console.error(`Error processing queue item ${item.id}:`, error);
          
          // Update status to failed
          await supabaseClient
            .from("einvoice_queue")
            .update({
              status: "failed",
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          failed++;
          return { success: false, item_id: item.id, error: error.message };
        }
      });

      const results = await Promise.all(batchPromises);
      processed += batch.length;

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < queueItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        succeeded,
        failed,
        message: `Processed ${processed} invoices: ${succeeded} succeeded, ${failed} failed`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("E-Invoice queue processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

