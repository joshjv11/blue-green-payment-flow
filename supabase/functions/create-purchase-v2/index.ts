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

interface PurchaseRequest {
  supplier: {
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
  dry_run?: boolean;
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
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: PurchaseRequest = await req.json();
    const { supplier, items, order_date, invoice_number, notes, seller_state, dry_run } = body;

    // Numeric coercion helper
    const n = (x: any) => Math.max(0, Number.isFinite(+x) ? +x : 0);

    // Step 1: Upsert/find supplier (in customers table with type='supplier')
    let supplierId: string | null = null;
    
    // Try to find existing supplier by email, then phone, then name
    if (supplier.email) {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("email", supplier.email)
        .maybeSingle();
      
      if (findError) {
        console.error({ stage: 'find_supplier_by_email', error: findError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'find_supplier_by_email',
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (existing) supplierId = existing.id;
    }
    
    if (!supplierId && supplier.phone) {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone", supplier.phone)
        .maybeSingle();
      
      if (findError) {
        console.error({ stage: 'find_supplier_by_phone', error: findError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'find_supplier_by_phone',
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (existing) supplierId = existing.id;
    }
    
    if (!supplierId) {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", supplier.name)
        .maybeSingle();
      
      if (findError) {
        console.error({ stage: 'find_supplier_by_name', error: findError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'find_supplier_by_name',
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (existing) supplierId = existing.id;
    }

    // Create supplier if not found
    if (!supplierId) {
      const { data: newSupplier, error: supplierError } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          name: supplier.name,
          email: supplier.email || null,
          phone: supplier.phone || null,
          address: supplier.address || null,
          country: supplier.country || "India",
          tax_id_label: supplier.gstin ? "GSTIN" : null,
          tax_id_value: supplier.gstin || null,
          type: "supplier",
        })
        .select("id")
        .single();

      if (supplierError) {
        console.error({ stage: 'create_supplier', error: supplierError });
        return new Response(JSON.stringify({
          ok: false,
          stage: 'create_supplier',
          code: supplierError.code,
          message: supplierError.message,
          details: supplierError.details,
          hint: supplierError.hint
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      supplierId = newSupplier.id;
    }

    // Step 2: Build supplier_snapshot
    const supplierSnapshot = {
      name: supplier.name,
      email: supplier.email || null,
      phone: supplier.phone || null,
      address: supplier.address || null,
      city: supplier.city || null,
      state: supplier.state || null,
      postal_code: supplier.postal_code || null,
      country: supplier.country || "India",
      gstin: supplier.gstin || null,
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
    const supplierState = supplier.state?.trim().toLowerCase() || "";
    const sellerStateNorm = seller_state?.trim().toLowerCase() || "";
    const isIntraState = supplierState && sellerStateNorm && supplierState === sellerStateNorm;
    const isIndia = (supplier.country || "India").toLowerCase().includes("india");

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

    // If dry run, return computed totals without inserting
    if (dry_run) {
      return new Response(
        JSON.stringify({
          ok: true,
          dry_run: true,
          totals: {
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            tax_amount,
            grand_total,
            amount_paid,
            isIntraState,
            isIndia,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Ensure order_date is YYYY-MM-DD format
    const formattedOrderDate = new Date(order_date ?? Date.now()).toISOString().slice(0, 10);

    // Step 4: Insert purchase_order matching the actual table schema
    const purchasePayload = {
      user_id: user.id,
      supplier_name: supplier.name,
      invoice_number: invoice_number || `PO-${Date.now()}`,
      transaction_date: formattedOrderDate,
      order_date: formattedOrderDate,
      subtotal,
      total_amount: subtotal,
      cgst_amount,
      sgst_amount,
      igst_amount,
      tax_amount,
      grand_total,
      amount_paid,
      status: "unpaid",
      notes: notes || null,
      supplier_gstin: supplier.gstin || null,
      supplier_address: supplier.address || null,
      supplier_state: supplier.state || null,
      place_of_supply: supplier.state || null,
      supplier_id: supplierId,
      supplier_snapshot: supplierSnapshot,
    };

    const { data: purchaseData, error: purchaseError } = await supabase
      .from("purchase_orders")
      .insert(purchasePayload)
      .select("id, invoice_number, grand_total, status")
      .single();

    if (purchaseError) {
      console.error({ stage: 'insert_purchase', error: purchaseError });
      return new Response(JSON.stringify({
        ok: false,
        stage: 'insert_purchase',
        code: purchaseError.code,
        message: purchaseError.message,
        details: purchaseError.details,
        hint: purchaseError.hint,
        payloadPreview: {
          itemsCount: items?.length ?? 0,
          subtotal,
          tax_amount,
          grand_total
        }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 5: Create order_lines entries (CRITICAL for Analytics profitability calculations)
    const orderLinesPayload = items.map((item) => {
      const quantity = n(item.quantity);
      const unit_price = n(item.unit_price);
      const discount = n(item.discount || 0);
      const tax_rate = n(item.tax_rate);
      
      const itemSubtotal = Math.max(0, quantity * unit_price - discount);
      const itemTaxableAmount = itemSubtotal;
      
      // Split tax based on isIntraState
      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;
      let itemTaxAmount = 0;
      
      if (isIndia && isIntraState) {
        itemCgst = itemTaxableAmount * (tax_rate / 200);
        itemSgst = itemTaxableAmount * (tax_rate / 200);
        itemTaxAmount = itemCgst + itemSgst;
      } else if (isIndia) {
        itemIgst = itemTaxableAmount * (tax_rate / 100);
        itemTaxAmount = itemIgst;
      } else {
        itemTaxAmount = itemTaxableAmount * (tax_rate / 100);
      }
      
      const itemTotal = itemSubtotal + itemTaxAmount;
      
      return {
        order_id: purchaseData.id,
        order_type: "purchase",
        product_name: item.description,
        description: item.description,
        quantity,
        unit_price,
        subtotal: itemSubtotal,
        taxable_amount: itemTaxableAmount,
        tax_rate,
        gst_rate: tax_rate,
        cgst_amount: itemCgst,
        sgst_amount: itemSgst,
        igst_amount: itemIgst,
        tax_amount: itemTaxAmount,
        total_amount: itemTotal,
      };
    });

    const { error: linesError } = await supabase
      .from("order_lines")
      .insert(orderLinesPayload);

    if (linesError) {
      console.error({ stage: 'insert_order_lines', error: linesError });
      // Don't fail the entire request, but log the error
      console.warn('Purchase order created but order_lines failed. Analytics may be incomplete.');
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          ...purchaseData,
          line_items_created: !linesError,
        },
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
