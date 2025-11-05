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
        // Decrypt password before calling GSTN
        const { data: decrypted } = await supabaseClient.rpc('decrypt_gstn_password', {
          encrypted_password: credentials.password_encrypted,
          user_id: user.id,
        });
        const decCreds = { ...credentials, password: decrypted as string };
        // Download Form 2A/2B from GSTN (placeholder -> real API integration later)
        form2aData = await downloadForm2A2B(decCreds, period);
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

// Download Form 2A/2B from GSTN (basic implementation; replace endpoints per ASP/GSTN spec)
async function downloadForm2A2B(credentials: any, period?: string): Promise<any[]> {
  try {
    const apiBase = credentials.api_endpoint || 'https://einvoice.gst.gov.in';
    const retPeriod = period || getCurrentPeriod();

    // 1) Authenticate (example endpoint - adjust to your provider)
    const authRes = await fetch(`${apiBase}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });

    if (!authRes.ok) {
      console.error('GSTN auth failed when downloading 2A/2B');
      return [];
    }

    const auth = await authRes.json();
    const token = auth.token;
    if (!token) return [];

    // 2) Fetch 2B (preferred for ITC)
    const twoBRes = await fetch(
      `${apiBase}/returns/gstr2b?ret_period=${encodeURIComponent(retPeriod)}&gstin=${encodeURIComponent(credentials.gstin)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!twoBRes.ok) {
      console.error('GSTR-2B fetch failed');
      return [];
    }

    const twoB = await twoBRes.json();
    const b2b = twoB?.data?.docdata?.b2b || [];

    // Normalize
    const invoices: any[] = [];
    for (const party of b2b) {
      const supplierGstin = party.ctin;
      for (const inv of party.inv || []) {
        const taxAmount = (inv.itms || []).reduce((sum: number, item: any) => {
          const d = item.itm_det || {};
          return sum + (Number(d.iamt) || 0) + (Number(d.camt) || 0) + (Number(d.samt) || 0);
        }, 0);
        invoices.push({
          invoice_number: inv.inum,
          invoice_date: inv.idt,
          supplier_gstin: supplierGstin,
          tax_amount: taxAmount,
          invoice_value: Number(inv.val) || 0,
        });
      }
    }

    return invoices;
  } catch (error) {
    console.error('Error downloading Form 2A/2B:', error);
    return [];
  }
}

function getCurrentPeriod(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

