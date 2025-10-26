import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate: number;
}

interface SaleRequest {
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    gstin?: string;
  };
  items: LineItem[];
  order_date: string;
  invoice_number: string;
  notes?: string;
  seller_state?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        ok: false,
        stage: 'auth_header',
        message: 'Missing authorization header'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error({ stage: 'get_user', error: userError });
      return new Response(JSON.stringify({
        ok: false,
        stage: 'get_user',
        message: userError?.message || 'Unauthorized',
        code: userError?.code,
        details: userError
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: SaleRequest = await req.json();
    const { customer, items, order_date, invoice_number, notes, seller_state } = body;

    // Numeric coercion helper
    const n = (x: any) => Math.max(0, Number.isFinite(+x) ? +x : 0);

    // Step 1: Upsert/find customer
    let customerId: string | null = null;
    
    // Try to find existing customer by email, then phone, then name
    if (customer.email) {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("email", customer.email)
        .eq("type", "customer")
        .maybeSingle();
      
      if (findError) {
        console.error({ stage: 'find_customer_by_email', error: findError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'find_customer_by_email',
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (existing) customerId = existing.id;
    }
    
    if (!customerId && customer.phone) {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone", customer.phone)
        .eq("type", "customer")
        .maybeSingle();
      
      if (findError) {
        console.error({ stage: 'find_customer_by_phone', error: findError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'find_customer_by_phone',
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (existing) customerId = existing.id;
    }
    
    if (!customerId) {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", customer.name)
        .eq("type", "customer")
        .maybeSingle();
      
      if (findError) {
        console.error({ stage: 'find_customer_by_name', error: findError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'find_customer_by_name',
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (existing) customerId = existing.id;
    }

    // Create customer if not found
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          name: customer.name,
          email: customer.email || null,
          phone: customer.phone || null,
          address: customer.address || null,
          country: customer.country || "India",
          tax_id_label: customer.gstin ? "GSTIN" : null,
          tax_id_value: customer.gstin || null,
          type: "customer",
        })
        .select("id")
        .single();

      if (customerError) {
        console.error({ stage: 'create_customer', error: customerError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'create_customer',
          code: customerError.code,
          message: customerError.message,
          details: customerError.details,
          hint: customerError.hint
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      customerId = newCustomer.id;
    }

    // Step 2: Build billing_snapshot
    const billingSnapshot = {
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      postal_code: customer.postal_code || "",
      country: customer.country || "India",
      gstin: customer.gstin || "",
    };

    // Step 3: Compute totals with safe numeric coercion
    let subtotal = 0;
    const lineItems: any[] = [];

    for (const item of items) {
      const quantity = n(item.quantity);
      const unit_price = n(item.unit_price);
      const discount = n(item.discount || 0);
      const tax_rate = n(item.tax_rate);
      
      const lineTotal = Math.max(0, quantity * unit_price - discount);
      subtotal += lineTotal;
      
      lineItems.push({
        description: item.description,
        quantity,
        unit_price,
        discount,
        tax_rate,
        line_total: lineTotal,
      });
    }

    // Determine tax split based on state matching
    const customerState = customer.state?.trim().toLowerCase() || "";
    const sellerStateNorm = seller_state?.trim().toLowerCase() || "";
    const isIntraState = customerState && sellerStateNorm && customerState === sellerStateNorm;
    const isIndia = (customer.country || "India").toLowerCase().includes("india");

    let cgst_amount = 0;
    let sgst_amount = 0;
    let igst_amount = 0;
    let tax_amount = 0;

    // Get average tax rate from items
    const avgTaxRate = items.length > 0 
      ? items.reduce((sum, item) => sum + item.tax_rate, 0) / items.length 
      : 18;

    if (isIndia && isIntraState) {
      // Intra-state: split CGST + SGST
      cgst_amount = subtotal * (avgTaxRate / 200);
      sgst_amount = subtotal * (avgTaxRate / 200);
      tax_amount = cgst_amount + sgst_amount;
    } else if (isIndia) {
      // Inter-state: IGST only
      igst_amount = subtotal * (avgTaxRate / 100);
      tax_amount = igst_amount;
    } else {
      // Non-India: generic tax
      tax_amount = subtotal * (avgTaxRate / 100);
    }

    const grand_total = subtotal + tax_amount;
    const amount_paid = 0;
    const balance_due = grand_total - amount_paid;

    // Ensure order_date is YYYY-MM-DD format
    const formattedOrderDate = new Date(order_date ?? Date.now()).toISOString().slice(0, 10);

    // Step 4: Insert sales_order matching the actual table schema
    const salePayload = {
      user_id: user.id,
      customer_name: customer.name,
      invoice_number: invoice_number || `INV-${Date.now()}`,
      transaction_date: formattedOrderDate,
      subtotal,
      total_amount: subtotal,
      cgst_amount,
      sgst_amount,
      igst_amount,
      tax_amount,
      grand_total,
      amount_paid,
      balance_due,
      payment_status: "unpaid",
      notes: notes || null,
      customer_gstin: customer.gstin || null,
      customer_address: customer.address || null,
      customer_state: customer.state || null,
      billing_snapshot: billingSnapshot,
    };

    const { data: saleData, error: saleError } = await supabase
      .from("sales_orders")
      .insert(salePayload)
      .select("id, invoice_number, grand_total, balance_due, payment_status")
      .single();

    if (saleError) {
      console.error({ stage: 'insert_sale', error: saleError });
      return new Response(JSON.stringify({
        ok: false,
        stage: 'insert_sale',
        code: saleError.code,
        message: saleError.message,
        details: saleError.details,
        hint: saleError.hint,
        payloadPreview: {
          itemsCount: items?.length ?? 0,
          subtotal,
          tax_amount,
          grand_total
        }
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: saleData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error({ stage: 'unexpected_error', error });
    return new Response(
      JSON.stringify({
        ok: false,
        stage: 'unexpected_error',
        message: error.message,
        error: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
