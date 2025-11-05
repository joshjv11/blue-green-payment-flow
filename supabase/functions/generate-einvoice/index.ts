import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EInvoiceRequest {
  sales_order_id: string;
  action: 'generate_irn' | 'generate_ewaybill' | 'sync_status';
}

interface GSTNCredentials {
  username: string;
  password: string;
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

    const { sales_order_id, action }: EInvoiceRequest = await req.json();

    if (!sales_order_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing sales_order_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch sales order
    const { data: salesOrder, error: orderError } = await supabaseClient
      .from("sales_orders")
      .select("*")
      .eq("id", sales_order_id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !salesOrder) {
      return new Response(
        JSON.stringify({ error: "Sales order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has Premium plan
    const { data: userPlan } = await supabaseClient
      .from("user_plans")
      .select("plan, is_active, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!userPlan || userPlan.plan !== 'premium' || !userPlan.is_active) {
      return new Response(
        JSON.stringify({ error: "E-invoicing is available only for Premium plan users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch GSTN credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from("gstn_credentials")
      .select("username, password_encrypted, gstin, api_endpoint")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: "GSTN credentials not configured. Please set up your GSTN credentials in settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt password using Postgres RPC
    const { data: decrypted, error: decErr } = await supabaseClient.rpc('decrypt_gstn_password', {
      encrypted_password: credentials.password_encrypted,
      user_id: user.id,
    });
    if (decErr || !decrypted) {
      return new Response(
        JSON.stringify({ error: "Failed to decrypt GSTN password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const gstnPassword = decrypted as string;

    // Prepare e-invoice payload according to GSTN API specification
    const einvoicePayload = prepareEInvoicePayload(salesOrder, credentials.gstin);

    let result;

    switch (action) {
      case 'generate_irn':
        result = await generateIRN(einvoicePayload, credentials.username, gstnPassword, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
        break;
      case 'generate_ewaybill':
        if (!salesOrder.irn) {
          return new Response(
            JSON.stringify({ error: "IRN must be generated first before generating e-way bill" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await generateEwayBill(salesOrder, credentials.username, gstnPassword, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
        break;
      case 'sync_status':
        if (!salesOrder.irn) {
          return new Response(
            JSON.stringify({ error: "IRN not found for this invoice" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await syncEInvoiceStatus(salesOrder.irn, credentials.username, gstnPassword, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Update sales order with result
    const updateData: any = {
      einvoice_status: result.status === 'success' ? 'generated' : 'failed',
      einvoice_synced_at: new Date().toISOString(),
      gstn_response_data: result,
    };

    if (result.status === 'success') {
      if (action === 'generate_irn' && result.irn) {
        updateData.irn = result.irn;
        updateData.irn_generated_at = new Date().toISOString();
        updateData.gstn_ack_no = result.ack_no;
        
        // Generate QR code for B2C invoices
        if (salesOrder.customer_gstin === null || salesOrder.customer_gstin === '') {
          updateData.qr_code_url = generateQRCode(salesOrder, result.irn);
        }
      } else if (action === 'generate_ewaybill' && result.eway_bill_no) {
        updateData.eway_bill_no = result.eway_bill_no;
      }
    }

    await supabaseClient
      .from("sales_orders")
      .update(updateData)
      .eq("id", sales_order_id);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("E-invoice generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Prepare e-invoice payload according to GSTN API spec
function prepareEInvoicePayload(salesOrder: any, sellerGstin: string): any {
  // This is a simplified payload structure
  // Actual GSTN API requires specific format per their documentation
  return {
    Version: "1.1",
    TranDt: new Date(salesOrder.transaction_date).toISOString().split('T')[0],
    TranId: salesOrder.invoice_number,
    DocDt: new Date(salesOrder.transaction_date).toISOString().split('T')[0],
    DocNo: salesOrder.invoice_number,
    DocTyp: "INV",
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: salesOrder.billing_snapshot?.company_name || "Company Name",
      Addr1: salesOrder.billing_snapshot?.address || "",
      Loc: salesOrder.billing_snapshot?.city || "",
      Pin: salesOrder.billing_snapshot?.postal_code || "",
      Stcd: getStateCode(salesOrder.billing_snapshot?.state || ""),
    },
    BuyerDtls: {
      Gstin: salesOrder.customer_gstin || "",
      LglNm: salesOrder.customer_name,
      Addr1: salesOrder.billing_snapshot?.customer_address || "",
      Loc: salesOrder.billing_snapshot?.customer_city || "",
      Pin: salesOrder.billing_snapshot?.customer_postal_code || "",
      Stcd: getStateCode(salesOrder.billing_snapshot?.customer_state || ""),
    },
    ItemList: [], // Will be populated from order_lines
    ValDtls: {
      AssVal: salesOrder.total_amount,
      CgstVal: salesOrder.cgst_amount || 0,
      SgstVal: salesOrder.sgst_amount || 0,
      IgstVal: salesOrder.igst_amount || 0,
      TotInvVal: salesOrder.grand_total,
    },
  };
}

// Generate IRN via GSTN API
async function generateIRN(payload: any, username: string, password: string, apiEndpoint: string): Promise<any> {
  try {
    // Authenticate with GSTN
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authResponse.ok) {
      throw new Error("GSTN authentication failed");
    }

    const authData = await authResponse.json();
    const token = authData.token;

    // Generate IRN
    const irnResponse = await fetch(`${apiEndpoint}/einvoice/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const irnData = await irnResponse.json();

    if (irnResponse.ok && irnData.Irn) {
      return {
        status: 'success',
        irn: irnData.Irn,
        ack_no: irnData.AckNo,
        ack_date: irnData.AckDt,
        message: 'IRN generated successfully',
      };
    } else {
      return {
        status: 'failed',
        error: irnData.ErrorMessage || 'Failed to generate IRN',
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      error: error.message || 'IRN generation failed',
    };
  }
}

// Generate E-way Bill
async function generateEwayBill(salesOrder: any, username: string, password: string, apiEndpoint: string): Promise<any> {
  try {
    // Authenticate with GSTN
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authResponse.ok) {
      throw new Error("GSTN authentication failed");
    }

    const authData = await authResponse.json();
    const token = authData.token;

    // Generate e-way bill
    const ewayResponse = await fetch(`${apiEndpoint}/ewaybill/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        Irn: salesOrder.irn,
        DocNo: salesOrder.invoice_number,
        // Add other required fields per GSTN API spec
      }),
    });

    const ewayData = await ewayResponse.json();

    if (ewayResponse.ok && ewayData.EwbNo) {
      return {
        status: 'success',
        eway_bill_no: ewayData.EwbNo,
        eway_bill_date: ewayData.EwbDt,
        message: 'E-way bill generated successfully',
      };
    } else {
      return {
        status: 'failed',
        error: ewayData.ErrorMessage || 'Failed to generate e-way bill',
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      error: error.message || 'E-way bill generation failed',
    };
  }
}

// Sync e-invoice status from GSTN
async function syncEInvoiceStatus(irn: string, username: string, password: string, apiEndpoint: string): Promise<any> {
  try {
    // Authenticate with GSTN
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!authResponse.ok) {
      throw new Error("GSTN authentication failed");
    }

    const authData = await authResponse.json();
    const token = authData.token;

    // Get invoice status
    const statusResponse = await fetch(`${apiEndpoint}/einvoice/status/${irn}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const statusData = await statusResponse.json();

    if (statusResponse.ok) {
      return {
        status: 'success',
        einvoice_status: statusData.Status,
        message: 'Status synced successfully',
      };
    } else {
      return {
        status: 'failed',
        error: statusData.ErrorMessage || 'Failed to sync status',
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      error: error.message || 'Status sync failed',
    };
  }
}

// Generate QR code URL for B2C invoices
function generateQRCode(salesOrder: any, irn: string): string {
  // Generate QR code data as per GSTN specification
  const qrData = {
    GSTIN: salesOrder.billing_snapshot?.gstin || "",
    InvoiceNumber: salesOrder.invoice_number,
    InvoiceDate: salesOrder.transaction_date,
    InvoiceValue: salesOrder.grand_total,
    IRN: irn,
  };

  // Use QR code generation service
  const qrDataString = JSON.stringify(qrData);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataString)}`;
}

// Helper function to get state code
function getStateCode(stateName: string): string {
  // This should match the state codes from your gst.ts utility
  const stateCodes: Record<string, string> = {
    "Andhra Pradesh": "37",
    "Arunachal Pradesh": "12",
    "Assam": "18",
    "Bihar": "10",
    // Add all states as needed
  };
  return stateCodes[stateName] || "";
}

