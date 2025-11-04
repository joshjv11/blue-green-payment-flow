import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkEInvoiceRequest {
  sales_order_ids: string[];
  action: 'generate_irn' | 'generate_ewaybill';
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

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sales_order_ids, action }: BulkEInvoiceRequest = await req.json();

    if (!sales_order_ids || !Array.isArray(sales_order_ids) || sales_order_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid sales_order_ids array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Premium plan
    const { data: userPlan } = await supabaseClient
      .from("user_plans")
      .select("plan, is_active, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!userPlan || userPlan.plan !== 'premium' || !userPlan.is_active) {
      return new Response(
        JSON.stringify({ error: "Bulk e-invoicing is available only for Premium plan users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify sales orders belong to user
    const { data: salesOrders, error: ordersError } = await supabaseClient
      .from("sales_orders")
      .select("id, invoice_number, irn, einvoice_status")
      .eq("user_id", user.id)
      .in("id", sales_order_ids);

    if (ordersError || !salesOrders || salesOrders.length !== sales_order_ids.length) {
      return new Response(
        JSON.stringify({ error: "Some sales orders not found or don't belong to user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add orders to queue
    const queueItems = salesOrders.map((order, index) => ({
      user_id: user.id,
      sales_order_id: order.id,
      status: 'pending',
      priority: salesOrders.length - index, // Process in reverse order
      retry_count: 0,
    }));

    const { data: queueData, error: queueError } = await supabaseClient
      .from("einvoice_queue")
      .insert(queueItems)
      .select();

    if (queueError) {
      return new Response(
        JSON.stringify({ error: "Failed to add orders to queue", details: queueError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process queue in background (async)
    processQueueAsync(supabaseClient, user.id, action).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${salesOrders.length} invoices added to processing queue`,
        queue_items: queueData?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Bulk e-invoice error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Process queue asynchronously
async function processQueueAsync(
  supabaseClient: any,
  userId: string,
  action: string
) {
  const BATCH_SIZE = 10; // Process 10 invoices at a time
  const MAX_RETRIES = 3;
  const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

  while (true) {
    // Fetch pending items
    const { data: pendingItems, error } = await supabaseClient
      .from("einvoice_queue")
      .select("*, sales_orders(*)")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error || !pendingItems || pendingItems.length === 0) {
      break; // No more items to process
    }

    // Process batch
    for (const item of pendingItems) {
      try {
        // Update status to processing
        await supabaseClient
          .from("einvoice_queue")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", item.id);

        // Call generate-einvoice function logic here
        // For now, we'll simulate it
        const result = await processEInvoice(item.sales_order_id, action, supabaseClient, userId);

        if (result.success) {
          // Mark as completed
          await supabaseClient
            .from("einvoice_queue")
            .update({
              status: "completed",
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        } else {
          // Handle failure
          const retryCount = item.retry_count + 1;
          if (retryCount < MAX_RETRIES) {
            await supabaseClient
              .from("einvoice_queue")
              .update({
                status: "retry",
                retry_count: retryCount,
                error_message: result.error,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.id);
          } else {
            await supabaseClient
              .from("einvoice_queue")
              .update({
                status: "failed",
                error_message: result.error,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.id);
          }
        }
      } catch (error: any) {
        console.error(`Error processing queue item ${item.id}:`, error);
        await supabaseClient
          .from("einvoice_queue")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }
    }

    // Delay before next batch
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

// Process individual e-invoice (simplified - actual implementation would call generate-einvoice logic)
async function processEInvoice(
  salesOrderId: string,
  action: string,
  supabaseClient: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch sales order
    const { data: salesOrder } = await supabaseClient
      .from("sales_orders")
      .select("*")
      .eq("id", salesOrderId)
      .eq("user_id", userId)
      .single();

    if (!salesOrder) {
      return { success: false, error: "Sales order not found" };
    }

    // Fetch GSTN credentials
    const { data: credentials } = await supabaseClient
      .from("gstn_credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!credentials) {
      return { success: false, error: "GSTN credentials not configured" };
    }

    // Here you would call the actual GSTN API
    // For now, returning success (actual implementation in generate-einvoice)
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

