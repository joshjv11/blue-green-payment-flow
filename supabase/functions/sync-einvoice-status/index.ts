import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function can be called manually or via cron job
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all invoices with IRN that need status sync
    // Sync invoices that haven't been synced in last 6 hours
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const { data: invoicesToSync, error: fetchError } = await supabaseClient
      .from("sales_orders")
      .select("id, user_id, irn, einvoice_status, einvoice_synced_at")
      .not("irn", "is", null)
      .or(`einvoice_synced_at.is.null,einvoice_synced_at.lt.${sixHoursAgo.toISOString()}`)
      .limit(100); // Process 100 at a time

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch invoices", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invoicesToSync || invoicesToSync.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No invoices need syncing", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by user_id to batch credentials fetching
    const userGroups = new Map<string, typeof invoicesToSync>();
    for (const invoice of invoicesToSync) {
      if (!userGroups.has(invoice.user_id)) {
        userGroups.set(invoice.user_id, []);
      }
      userGroups.get(invoice.user_id)!.push(invoice);
    }

    let syncedCount = 0;
    let failedCount = 0;

    // Process each user's invoices
    for (const [userId, invoices] of userGroups) {
      // Fetch user's GSTN credentials
      const { data: credentials } = await supabaseClient
        .from("gstn_credentials")
        .select("username, password_encrypted, gstin, api_endpoint")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!credentials) {
        console.log(`Skipping user ${userId}: No GSTN credentials`);
        continue;
      }

      // Authenticate with GSTN once per user
      const authToken = await authenticateGSTN(
        credentials.username,
        credentials.password_encrypted,
        credentials.api_endpoint || 'https://einvoice.gst.gov.in'
      );

      if (!authToken) {
        console.log(`Skipping user ${userId}: Authentication failed`);
        continue;
      }

      // Sync each invoice
      for (const invoice of invoices) {
        try {
          const statusResult = await syncInvoiceStatus(
            invoice.irn!,
            authToken,
            credentials.api_endpoint || 'https://einvoice.gst.gov.in'
          );

          if (statusResult.success) {
            // Update invoice status
            await supabaseClient
              .from("sales_orders")
              .update({
                einvoice_status: statusResult.status,
                einvoice_synced_at: new Date().toISOString(),
                gstn_response_data: statusResult.data,
              })
              .eq("id", invoice.id);

            syncedCount++;
          } else {
            failedCount++;
            console.error(`Failed to sync invoice ${invoice.id}:`, statusResult.error);
          }
        } catch (error: any) {
          failedCount++;
          console.error(`Error syncing invoice ${invoice.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Status sync completed`,
        synced: syncedCount,
        failed: failedCount,
        total: invoicesToSync.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Sync e-invoice status error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Authenticate with GSTN
async function authenticateGSTN(username: string, password: string, apiEndpoint: string): Promise<string | null> {
  try {
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authResponse.ok) {
      return null;
    }

    const authData = await authResponse.json();
    return authData.token || null;
  } catch (error) {
    console.error("GSTN authentication error:", error);
    return null;
  }
}

// Sync invoice status from GSTN
async function syncInvoiceStatus(irn: string, token: string, apiEndpoint: string): Promise<any> {
  try {
    const statusResponse = await fetch(`${apiEndpoint}/einvoice/status/${irn}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const statusData = await statusResponse.json();

    if (statusResponse.ok) {
      return {
        success: true,
        status: statusData.Status || 'generated',
        data: statusData,
      };
    } else {
      return {
        success: false,
        error: statusData.ErrorMessage || 'Failed to sync status',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Status sync failed',
    };
  }
}

