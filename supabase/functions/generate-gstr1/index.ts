import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GSTR1Request {
  filing_period: string; // "YYYY-MM" or "YYYY-Q1/Q2/Q3/Q4"
  filing_type: "monthly" | "quarterly";
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

    // Get auth token
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

    const { filing_period, filing_type, gstin }: GSTR1Request = await req.json();

    if (!filing_period || !filing_type || !gstin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filing_period, filing_type, gstin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date range for the period
    const { startDate, endDate } = calculatePeriodDates(filing_period, filing_type);

    // Fetch sales orders for the period
    const { data: salesOrders, error: salesError } = await supabaseClient
      .from("sales_orders")
      .select(`
        *,
        order_lines (
          id,
          product_name,
          hsn_sac_code,
          quantity,
          unit_price,
          tax_rate,
          taxable_amount,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total_amount
        )
      `)
      .eq("user_id", user.id)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate)
      .order("transaction_date", { ascending: true });

    if (salesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch sales orders", details: salesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!salesOrders || salesOrders.length === 0) {
      return new Response(
        JSON.stringify({ error: "No sales orders found for the selected period" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate GSTR-1 JSON as per GSTN format
    const gstr1Data = generateGSTR1JSON(salesOrders, gstin, filing_period, filing_type);

    // Calculate summary
    const summary = calculateGSTR1Summary(salesOrders);

    // Save to database
    const { data: filing, error: saveError } = await supabaseClient
      .from("gstr1_filings")
      .upsert({
        user_id: user.id,
        filing_period,
        filing_type,
        gstin,
        status: "generated",
        json_data: gstr1Data,
        summary_data: summary,
        total_sales_value: summary.total_sales_value,
        total_taxable_value: summary.total_taxable_value,
        total_tax_amount: summary.total_tax_amount,
        total_invoices: summary.total_invoices,
        due_date: calculateDueDate(filing_period, filing_type),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,filing_period,filing_type",
      })
      .select()
      .single();

    if (saveError) {
      return new Response(
        JSON.stringify({ error: "Failed to save GSTR-1 filing", details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create audit trail entry
    await supabaseClient
      .from("gst_audit_trail")
      .insert({
        user_id: user.id,
        filing_type: "gstr1",
        filing_id: filing.id,
        action: "generated",
        new_value: { filing_period, filing_type, summary },
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
          uploadResult = await uploadGSTR1ToGSTN(
            gstr1Data,
            credentials.username,
            decrypted as string,
            credentials.api_endpoint || 'https://einvoice.gst.gov.in',
            filing_period
          );

          // Update filing status based on upload result
          if (uploadResult.success) {
            await supabaseClient
              .from("gstr1_filings")
              .update({
                status: "uploaded",
                gstn_ack_no: uploadResult.ack_no,
                uploaded_at: new Date().toISOString(),
              })
              .eq("id", filing.id);
          } else {
            await supabaseClient
              .from("gstr1_filings")
              .update({
                status: "upload_failed",
                upload_error: uploadResult.error,
              })
              .eq("id", filing.id);
          }
        }
      }
    } catch (uploadError) {
      console.error("GSTR-1 upload error (non-blocking):", uploadError);
      // Don't fail the entire request if upload fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        filing_id: filing.id,
        summary,
        json_data: gstr1Data,
        upload_result: uploadResult,
        message: uploadResult?.success 
          ? "GSTR-1 generated and uploaded to GSTN successfully" 
          : "GSTR-1 generated successfully" + (uploadResult ? `. Upload failed: ${uploadResult.error}` : ". Upload skipped (no credentials)"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("GSTR-1 generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Calculate period dates
function calculatePeriodDates(period: string, type: string): { startDate: string; endDate: string } {
  if (type === "monthly") {
    const [year, month] = period.split("-");
    const startDate = `${year}-${month}-01`;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return { startDate, endDate };
  } else {
    // Quarterly
    const [year, quarter] = period.split("-Q");
    const quarterNum = parseInt(quarter);
    const startMonth = (quarterNum - 1) * 3 + 1;
    const endMonth = quarterNum * 3;
    const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), endMonth, 0);
    return {
      startDate,
      endDate: `${year}-${String(endMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
    };
  }
}

// Generate GSTR-1 JSON as per GSTN format
function generateGSTR1JSON(salesOrders: any[], gstin: string, period: string, type: string): any {
  // Group by invoice type and tax rate
  const b2bInvoices: any[] = [];
  const b2cInvoices: any[] = [];
  const hsnSummary: Record<string, any> = {};

  for (const order of salesOrders) {
    const invoice = {
      ctin: order.customer_gstin || null, // Customer GSTIN (null for B2C)
      pos: order.place_of_supply || order.customer_state || "",
      inum: order.invoice_number,
      idt: order.transaction_date,
      val: parseFloat(order.grand_total) || 0,
      rt: 0, // Will be calculated from line items
      txval: parseFloat(order.subtotal) || 0,
      iamt: parseFloat(order.igst_amount) || 0,
      camt: parseFloat(order.cgst_amount) || 0,
      samt: parseFloat(order.sgst_amount) || 0,
      csamt: 0, // Cess amount if applicable
      items: order.order_lines || [],
    };

    // Determine if B2B or B2C
    if (order.customer_gstin && order.customer_gstin.trim() !== "") {
      b2bInvoices.push(invoice);
    } else {
      b2cInvoices.push(invoice);
    }

    // Aggregate HSN summary
    for (const line of order.order_lines || []) {
      const hsn = line.hsn_sac_code || "NIL";
      if (!hsnSummary[hsn]) {
        hsnSummary[hsn] = {
          hsn: hsn,
          desc: line.product_name || "",
          uqc: "NOS", // Unit of Quantity Code
          qty: 0,
          rt: parseFloat(line.tax_rate) || 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };
      }
      hsnSummary[hsn].qty += parseFloat(line.quantity) || 0;
      hsnSummary[hsn].txval += parseFloat(line.taxable_amount) || 0;
      hsnSummary[hsn].iamt += parseFloat(line.igst_amount) || 0;
      hsnSummary[hsn].camt += parseFloat(line.cgst_amount) || 0;
      hsnSummary[hsn].samt += parseFloat(line.sgst_amount) || 0;
    }
  }

  // Build GSTR-1 JSON as per GSTN format
  return {
    gstin: gstin,
    ret_period: period,
    b2b: b2bInvoices.map((inv) => ({
      ctin: inv.ctin,
      inv: [{
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        pos: inv.pos,
        rchrg: inv.rchrg || "N",
        inv_typ: "R", // Regular invoice
        itms: inv.items.map((item: any) => ({
          num: 1,
          itm_det: {
            hsn_sc: item.hsn_sac_code || "",
            qty: parseFloat(item.quantity) || 0,
            rt: parseFloat(item.tax_rate) || 0,
            txval: parseFloat(item.taxable_amount) || 0,
            iamt: parseFloat(item.igst_amount) || 0,
            camt: parseFloat(item.cgst_amount) || 0,
            samt: parseFloat(item.sgst_amount) || 0,
            csamt: 0,
          },
        })),
      }],
    })),
    b2cl: b2cInvoices.filter((inv) => inv.val >= 250000).map((inv) => ({
      pos: inv.pos,
      inv: [{
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        itms: inv.items.map((item: any) => ({
          num: 1,
          itm_det: {
            hsn_sc: item.hsn_sac_code || "",
            qty: parseFloat(item.quantity) || 0,
            rt: parseFloat(item.tax_rate) || 0,
            txval: parseFloat(item.taxable_amount) || 0,
            iamt: parseFloat(item.igst_amount) || 0,
            camt: parseFloat(item.cgst_amount) || 0,
            samt: parseFloat(item.sgst_amount) || 0,
            csamt: 0,
          },
        })),
      }],
    })),
    b2cs: b2cInvoices.filter((inv) => inv.val < 250000).map((inv) => ({
      pos: inv.pos,
      typ: "OE", // Outward Exempt
      etin: "",
      rt: inv.items[0]?.tax_rate || 0,
      txval: inv.txval,
      iamt: inv.iamt,
      camt: inv.camt,
      samt: inv.samt,
      csamt: 0,
    })),
    hsn: Object.values(hsnSummary),
  };
}

// Calculate GSTR-1 summary
function calculateGSTR1Summary(salesOrders: any[]): any {
  let total_sales_value = 0;
  let total_taxable_value = 0;
  let total_tax_amount = 0;
  let total_cgst = 0;
  let total_sgst = 0;
  let total_igst = 0;
  let b2b_count = 0;
  let b2c_count = 0;

  for (const order of salesOrders) {
    total_sales_value += parseFloat(order.grand_total) || 0;
    total_taxable_value += parseFloat(order.subtotal) || 0;
    total_tax_amount += parseFloat(order.tax_amount) || 0;
    total_cgst += parseFloat(order.cgst_amount) || 0;
    total_sgst += parseFloat(order.sgst_amount) || 0;
    total_igst += parseFloat(order.igst_amount) || 0;

    if (order.customer_gstin && order.customer_gstin.trim() !== "") {
      b2b_count++;
    } else {
      b2c_count++;
    }
  }

  return {
    total_sales_value,
    total_taxable_value,
    total_tax_amount,
    total_cgst,
    total_sgst,
    total_igst,
    total_invoices: salesOrders.length,
    b2b_count,
    b2c_count,
  };
}

// Upload GSTR-1 to GSTN portal
async function uploadGSTR1ToGSTN(
  gstr1Data: any,
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

    // 2. Upload GSTR-1 JSON
    const uploadResponse = await fetch(`${apiEndpoint}/returns/gstr1/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gstin: gstr1Data.gstin,
        ret_period: period,
        data: gstr1Data,
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

// Calculate due date for filing
function calculateDueDate(period: string, type: string): string {
  if (type === "monthly") {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month), 0); // Last day of month
    // GSTR-1 due date is 11th of next month
    const dueDate = new Date(parseInt(year), parseInt(month), 11);
    return dueDate.toISOString().split('T')[0];
  } else {
    // Quarterly: Due date is 13th of month following quarter end
    const [year, quarter] = period.split("-Q");
    const quarterNum = parseInt(quarter);
    const endMonth = quarterNum * 3;
    const dueDate = new Date(parseInt(year), endMonth, 13);
    return dueDate.toISOString().split('T')[0];
  }
}

