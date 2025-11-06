import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GSTR3BRequest {
  filing_period: string; // "YYYY-MM"
  gstin: string;
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
        JSON.stringify({ error: "GSTR filing is available only for Premium plan users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { filing_period, gstin }: GSTR3BRequest = await req.json();

    if (!filing_period || !gstin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filing_period, gstin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date range
    const [year, month] = filing_period.split("-");
    const startDate = `${year}-${month}-01`;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Fetch outward supplies (sales) for the period
    const { data: salesOrders, error: salesError } = await supabaseClient
      .from("sales_orders")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (salesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch sales orders", details: salesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch inward supplies (purchases) for the period
    const { data: purchaseOrders, error: purchaseError } = await supabaseClient
      .from("purchase_orders")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (purchaseError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch purchase orders", details: purchaseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ITC reconciliation data
    const { data: itcData, error: itcError } = await supabaseClient
      .from("itc_reconciliation")
      .select("*")
      .eq("user_id", user.id)
      .gte("invoice_date", startDate)
      .lte("invoice_date", endDate);

    // Calculate GSTR-3B summary
    const summary = calculateGSTR3BSummary(salesOrders || [], purchaseOrders || [], itcData || []);

    // Generate GSTR-3B JSON as per GSTN format
    const gstr3bData = generateGSTR3BJSON(summary, gstin, filing_period);

    // Save to database
    const { data: filing, error: saveError } = await supabaseClient
      .from("gstr3b_filings")
      .upsert({
        user_id: user.id,
        filing_period,
        gstin,
        status: "generated",
        json_data: gstr3bData,
        outward_supply_value: summary.outward_supply_value,
        inward_supply_value: summary.inward_supply_value,
        itc_available: summary.itc_available,
        itc_utilized: summary.itc_utilized,
        tax_payable: summary.tax_payable,
        tax_paid: summary.tax_paid || 0,
        due_date: calculateDueDate(filing_period),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,filing_period",
      })
      .select()
      .single();

    if (saveError) {
      return new Response(
        JSON.stringify({ error: "Failed to save GSTR-3B filing", details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create audit trail
    await supabaseClient
      .from("gst_audit_trail")
      .insert({
        user_id: user.id,
        filing_type: "gstr3b",
        filing_id: filing.id,
        action: "generated",
        new_value: { filing_period, summary },
        changed_by: user.id,
        changed_at: new Date().toISOString(),
      });

    // Auto-upload to GSTN portal if credentials are available
    let uploadResult = null;
    try {
      const { data: credentials } = await supabaseClient
        .from("gstn_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (credentials) {
        // Decrypt password
        const { data: decrypted } = await supabaseClient.rpc('decrypt_gstn_password', {
          encrypted_password: credentials.password_encrypted,
          user_id: user.id,
        });

        if (decrypted) {
          uploadResult = await uploadGSTR3BToGSTN(
            gstr3bData,
            credentials.username,
            decrypted as string,
            credentials.api_endpoint || 'https://einvoice.gst.gov.in',
            filing_period
          );

          // Update filing status based on upload result
          if (uploadResult.success) {
            await supabaseClient
              .from("gstr3b_filings")
              .update({
                status: "uploaded",
                gstn_ack_no: uploadResult.ack_no,
                uploaded_at: new Date().toISOString(),
              })
              .eq("id", filing.id);
          } else {
            await supabaseClient
              .from("gstr3b_filings")
              .update({
                status: "upload_failed",
                upload_error: uploadResult.error,
              })
              .eq("id", filing.id);
          }
        }
      }
    } catch (uploadError) {
      console.error("GSTR-3B upload error (non-blocking):", uploadError);
      // Don't fail the entire request if upload fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        filing_id: filing.id,
        summary,
        json_data: gstr3bData,
        upload_result: uploadResult,
        message: uploadResult?.success 
          ? "GSTR-3B generated and uploaded to GSTN successfully" 
          : "GSTR-3B generated successfully" + (uploadResult ? `. Upload failed: ${uploadResult.error}` : ". Upload skipped (no credentials)"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("GSTR-3B generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Calculate GSTR-3B summary
function calculateGSTR3BSummary(sales: any[], purchases: any[], itcData: any[]): any {
  // Outward supplies
  let outward_supply_value = 0;
  let outward_tax = 0;
  let outward_cgst = 0;
  let outward_sgst = 0;
  let outward_igst = 0;

  for (const sale of sales) {
    outward_supply_value += parseFloat(sale.grand_total) || 0;
    outward_tax += parseFloat(sale.tax_amount) || 0;
    outward_cgst += parseFloat(sale.cgst_amount) || 0;
    outward_sgst += parseFloat(sale.sgst_amount) || 0;
    outward_igst += parseFloat(sale.igst_amount) || 0;
  }

  // Inward supplies
  let inward_supply_value = 0;
  let inward_tax = 0;
  let inward_cgst = 0;
  let inward_sgst = 0;
  let inward_igst = 0;

  for (const purchase of purchases) {
    inward_supply_value += parseFloat(purchase.grand_total) || 0;
    inward_tax += parseFloat(purchase.tax_amount) || 0;
    inward_cgst += parseFloat(purchase.cgst_amount) || 0;
    inward_sgst += parseFloat(purchase.sgst_amount) || 0;
    inward_igst += parseFloat(purchase.igst_amount) || 0;
  }

  // ITC (Input Tax Credit)
  let itc_available = 0;
  let itc_utilized = 0;

  for (const itc of itcData) {
    if (itc.reconciliation_status === 'matched' || itc.reconciliation_status === 'pending') {
      itc_available += parseFloat(itc.itc_eligible) || 0;
      itc_utilized += parseFloat(itc.itc_claimed) || 0;
    }
  }

  // Tax payable = Outward tax - ITC utilized
  const tax_payable = outward_tax - itc_utilized;

  return {
    outward_supply_value,
    outward_tax,
    outward_cgst,
    outward_sgst,
    outward_igst,
    inward_supply_value,
    inward_tax,
    inward_cgst,
    inward_sgst,
    inward_igst,
    itc_available,
    itc_utilized,
    tax_payable,
    tax_paid: 0, // Will be updated when payment is made
  };
}

// Generate GSTR-3B JSON as per GSTN format
function generateGSTR3BJSON(summary: any, gstin: string, period: string): any {
  return {
    gstin: gstin,
    ret_period: period,
    sup_details: {
      osup_det: {
        txval: summary.outward_supply_value,
        iamt: summary.outward_igst,
        camt: summary.outward_cgst,
        samt: summary.outward_sgst,
        csamt: 0, // Cess
      },
      inter_sup: {
        unreg_details: [],
        comp_details: [],
        uin_details: [],
      },
    },
    inter_sup: {
      unreg_details: [],
      comp_details: [],
      uin_details: [],
    },
    itc_elg: {
      itc_avl: [
        {
          ty: "IMPG", // Import of Goods
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        {
          ty: "IMPS", // Import of Services
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        {
          ty: "ISD", // Input Service Distributor
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        {
          ty: "RUL", // All other ITC
          iamt: summary.inward_igst,
          camt: summary.inward_cgst,
          samt: summary.inward_sgst,
          csamt: 0,
        },
      ],
      itc_rev: {
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      },
      itc_net: {
        iamt: summary.inward_igst,
        camt: summary.inward_cgst,
        samt: summary.inward_sgst,
        csamt: 0,
      },
      itc_inelg: {
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      },
    },
    inward_sup: {
      isup_details: {
        txval: summary.inward_supply_value,
        iamt: summary.inward_igst,
        camt: summary.inward_cgst,
        samt: summary.inward_sgst,
        csamt: 0,
      },
    },
    intr_lt: {
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    },
    intr_cur: {
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    },
    tax_pmt: {
      tax: summary.tax_payable,
      interest: 0,
      penalty: 0,
      fee: 0,
      other: 0,
      tot_payment: summary.tax_payable,
    },
    txli: {
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    },
    txli_cur: {
      iamt: 0,
      camt: 0,
      samt: 0,
      csamt: 0,
    },
  };
}

// Upload GSTR-3B to GSTN portal
async function uploadGSTR3BToGSTN(
  gstr3bData: any,
  username: string,
  password: string,
  apiEndpoint: string,
  period: string
): Promise<{ success: boolean; ack_no?: string; error?: string }> {
  try {
    // 1. Authenticate with GSTN
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authResponse.ok) {
      return { success: false, error: "GSTN authentication failed" };
    }

    const authData = await authResponse.json();
    const token = authData.token;
    if (!token) {
      return { success: false, error: "No auth token received" };
    }

    // 2. Upload GSTR-3B JSON
    const uploadResponse = await fetch(`${apiEndpoint}/returns/gstr3b/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gstin: gstr3bData.gstin,
        ret_period: period,
        data: gstr3bData,
      }),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || errorData.message || `Upload failed: ${uploadResponse.statusText}` 
      };
    }

    const uploadData = await uploadResponse.json();
    
    return {
      success: true,
      ack_no: uploadData.ack_no || uploadData.acknowledgement_number || null,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Upload failed" };
  }
}

// Calculate due date (20th of next month)
function calculateDueDate(period: string): string {
  const [year, month] = period.split("-");
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-20`;
}

