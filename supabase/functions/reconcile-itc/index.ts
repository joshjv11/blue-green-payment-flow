import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ITCReconciliationRequest {
  period?: string; // Optional: "YYYY-MM" to reconcile specific period
  auto_download_form2a?: boolean; // Auto-download Form 2A/2B from GSTN
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

    // Check Premium plan
    const { data: userPlan } = await supabaseClient
      .from("user_plans")
      .select("plan, is_active, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!userPlan || userPlan.plan !== 'premium' || !userPlan.is_active) {
      return new Response(
        JSON.stringify({ error: "ITC reconciliation is available only for Premium plan users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { period, auto_download_form2a = false }: ITCReconciliationRequest = await req.json() || {};

    // Fetch purchase orders (inward supplies)
    let query = supabaseClient
      .from("purchase_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false });

    if (period) {
      const [year, month] = period.split("-");
      const startDate = `${year}-${month}-01`;
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;
      query = query.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }

    const { data: purchases, error: purchaseError } = await query;

    if (purchaseError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch purchase orders", details: purchaseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!purchases || purchases.length === 0) {
      return new Response(
        JSON.stringify({ error: "No purchase orders found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GSTN credentials for Form 2A/2B download
    let form2aData: any = null;
    if (auto_download_form2a) {
      const { data: credentials } = await supabaseClient
        .from("gstn_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (credentials) {
        // Download Form 2A/2B from GSTN (simplified - actual implementation needs GSTN API)
        form2aData = await downloadForm2A2B(credentials, period);
      }
    }

    // Reconcile ITC for each purchase
    const reconciliationResults = [];
    const mismatches = [];

    for (const purchase of purchases) {
      // Calculate ITC eligible
      const itcEligible = (parseFloat(purchase.tax_amount) || 0);
      const itcClaimed = 0; // Will be updated from GSTR-3B filings

      // Check Form 2A/2B if available
      let form2aMatch = null;
      let mismatchReason = null;
      let reconciliationStatus = "pending";

      if (form2aData) {
        form2aMatch = form2aData.find((item: any) =>
          item.invoice_number === purchase.invoice_number &&
          item.invoice_date === purchase.transaction_date
        );

        if (form2aMatch) {
          const form2aTax = parseFloat(form2aMatch.tax_amount) || 0;
          const purchaseTax = parseFloat(purchase.tax_amount) || 0;

          if (Math.abs(form2aTax - purchaseTax) < 0.01) {
            reconciliationStatus = "matched";
          } else {
            reconciliationStatus = "mismatch";
            mismatchReason = `Tax amount mismatch: Your data shows ₹${purchaseTax}, GSTN shows ₹${form2aTax}`;
            mismatches.push({
              purchase_id: purchase.id,
              invoice_number: purchase.invoice_number,
              mismatch_reason: mismatchReason,
            });
          }
        } else {
          reconciliationStatus = "missing";
          mismatchReason = "Invoice not found in Form 2A/2B";
          mismatches.push({
            purchase_id: purchase.id,
            invoice_number: purchase.invoice_number,
            mismatch_reason: mismatchReason,
          });
        }
      }

      // Upsert ITC reconciliation record
      const { data: itcRecord, error: itcError } = await supabaseClient
        .from("itc_reconciliation")
        .upsert({
          user_id: user.id,
          purchase_order_id: purchase.id,
          gstin: purchase.supplier_gstin || "",
          invoice_number: purchase.invoice_number,
          invoice_date: purchase.transaction_date,
          invoice_value: parseFloat(purchase.grand_total) || 0,
          tax_amount: parseFloat(purchase.tax_amount) || 0,
          itc_eligible: itcEligible,
          itc_claimed: itcClaimed,
          form2a_2b_data: form2aMatch || null,
          form2a_2b_tax_amount: form2aMatch ? parseFloat(form2aMatch.tax_amount) : null,
          form2a_2b_status: form2aMatch ? reconciliationStatus : null,
          mismatch_reason: mismatchReason,
          reconciliation_status: reconciliationStatus,
          reconciled_at: new Date().toISOString(),
          reconciled_by: "auto",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,invoice_number,invoice_date",
        })
        .select()
        .single();

      if (!itcError && itcRecord) {
        reconciliationResults.push(itcRecord);
      }
    }

    // Create mismatch alerts
    for (const mismatch of mismatches) {
      await supabaseClient
        .from("gst_mismatch_alerts")
        .insert({
          user_id: user.id,
          alert_type: "itc_mismatch",
          severity: "high",
          title: "ITC Mismatch Detected",
          description: mismatch.mismatch_reason,
          related_invoice_id: mismatch.purchase_id,
          mismatch_details: mismatch,
          is_resolved: false,
          created_at: new Date().toISOString(),
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reconciled_count: reconciliationResults.length,
        matched_count: reconciliationResults.filter(r => r.reconciliation_status === "matched").length,
        mismatch_count: mismatches.length,
        mismatches,
        message: "ITC reconciliation completed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("ITC reconciliation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Download Form 2A/2B from GSTN (simplified - needs actual GSTN API integration)
async function downloadForm2A2B(credentials: any, period?: string): Promise<any[]> {
  try {
    // This is a placeholder - actual implementation needs GSTN API
    // Form 2A/2B contains auto-populated data from GSTN based on supplier filings
    
    // Simulated response - replace with actual GSTN API call
    return [];
  } catch (error) {
    console.error("Error downloading Form 2A/2B:", error);
    return [];
  }
}

