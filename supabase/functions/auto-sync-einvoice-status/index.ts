import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Sync invoices with IRN in last 30 days where status not approved or stale
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const { data: invoicesToSync, error: fetchError } = await supabaseClient
      .from("sales_orders")
      .select("id, user_id, irn, einvoice_status, einvoice_synced_at, billing_snapshot")
      .not("irn", "is", null)
      .gte("irn_generated_at", cutoff.toISOString())
      .or(`einvoice_synced_at.is.null,einvoice_synced_at.lt.${sixHoursAgo.toISOString()}`)
      .limit(200);

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

    const userGroups = new Map<string, typeof invoicesToSync>();
    for (const invoice of invoicesToSync) {
      if (!userGroups.has(invoice.user_id)) userGroups.set(invoice.user_id, []);
      userGroups.get(invoice.user_id)!.push(invoice);
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const [userId, invoices] of userGroups) {
      const { data: credentials } = await supabaseClient
        .from("gstn_credentials")
        .select("username, password_encrypted, gstin, api_endpoint")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!credentials) continue;

      const { data: decrypted } = await supabaseClient.rpc('decrypt_gstn_password', {
        encrypted_password: credentials.password_encrypted,
        user_id: userId,
      });
      if (!decrypted) continue;

      const token = await authenticateGSTN(credentials.username, decrypted as string, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
      if (!token) continue;

      for (const invoice of invoices) {
        try {
          const status = await syncInvoiceStatus(invoice.irn!, token, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
          if (status.success) {
            await supabaseClient
              .from("sales_orders")
              .update({
                einvoice_status: status.status,
                einvoice_synced_at: new Date().toISOString(),
                gstn_response_data: status.data,
              })
              .eq("id", invoice.id);
            syncedCount++;
          } else {
            failedCount++;
          }
        } catch (_) {
          failedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount, failed: failedCount, total: invoicesToSync.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function authenticateGSTN(username: string, password: string, apiEndpoint: string): Promise<string | null> {
  try {
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!authResponse.ok) return null;
    const authData = await authResponse.json();
    return authData.token || null;
  } catch (e) {
    return null;
  }
}

async function syncInvoiceStatus(irn: string, token: string, apiEndpoint: string): Promise<any> {
  try {
    const res = await fetch(`${apiEndpoint}/einvoice/status/${irn}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, status: data.Status || 'generated', data };
    }
    return { success: false, error: data?.ErrorMessage || 'Failed' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}


