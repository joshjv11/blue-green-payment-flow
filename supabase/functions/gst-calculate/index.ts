import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { calculateGstComponents } from "../_shared/gst.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ManualLineInput = {
  id?: string;
  description?: string | null;
  hsnSacCode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  taxableValue: number;
  gstRate?: number | null;
  metadata?: Record<string, unknown>;
};

type InvoicePayload = {
  invoiceNumber: string;
  invoiceDate: string;
  customerName?: string | null;
  customerIdentifier?: string | null;
  customerStateCode?: string | null;
  gstRate?: number | null;
  placeOfSupply?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
};

interface CalculateRequestBody {
  entityId: string;
  invoiceId?: string;
  triggerSource?: string;
  performedBy?: string;
  overrideRate?: number;
  invoice?: InvoicePayload;
  lineItems?: ManualLineInput[];
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "Missing SUPABASE configuration" }, { status: 500 });
  }

  let body: CalculateRequestBody;
  try {
    body = await req.json();
  } catch (_err) {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.entityId) {
    return jsonResponse({ error: "entityId is required" }, { status: 400 });
  }

  if (!body.invoiceId && !body.invoice) {
    return jsonResponse({ error: "invoice or invoiceId required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const triggerSource = body.triggerSource ?? "api_gst_calculate";
  const performedBy = body.performedBy ?? null;

  try {
    const { data: entity, error: entityError } = await supabase
      .from("gst_entities")
      .select("id, state_code, settings")
      .eq("id", body.entityId)
      .maybeSingle();

    if (entityError) throw entityError;
    if (!entity) return jsonResponse({ error: "GST entity not found" }, { status: 404 });

    let invoiceId = body.invoiceId ?? null;

    const { data: existingInvoice, error: existingInvoiceError } = invoiceId
      ? await supabase
        .from("gst_invoices")
        .select("*, invoice_items:gst_invoice_items(*)")
        .eq("id", invoiceId)
        .eq("entity_id", body.entityId)
        .maybeSingle()
      : { data: null, error: null };

    if (existingInvoiceError) throw existingInvoiceError;
    if (invoiceId && !existingInvoice) {
      return jsonResponse({ error: "Invoice not found for entity" }, { status: 404 });
    }

    const baseInvoice = body.invoice ?? undefined;

    const supplyState =
      baseInvoice?.placeOfSupply
      ?? existingInvoice?.place_of_supply
      ?? entity.state_code
      ?? null;

    const customerState =
      baseInvoice?.customerStateCode
      ?? existingInvoice?.customer_state_code
      ?? null;

    const invoiceRate =
      body.overrideRate
      ?? baseInvoice?.gstRate
      ?? existingInvoice?.gst_rate
      ?? entity.settings?.default_gst_rate
      ?? 18;

    const manualLines = body.lineItems ?? undefined;
    const existingLines = existingInvoice?.invoice_items ?? [];

    const sourceLines: ManualLineInput[] = manualLines ?? existingLines.map((line: any) => ({
      id: line.id,
      description: line.description,
      hsnSacCode: line.hsn_sac_code,
      quantity: line.quantity,
      unitPrice: line.unit_price,
      taxableValue: Number(line.taxable_value ?? 0),
      gstRate: Number(line.gst_rate ?? invoiceRate),
      metadata: line.metadata ?? {},
    }));

    if (!sourceLines.length) {
      return jsonResponse({ error: "At least one line item is required" }, { status: 400 });
    }

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let interState = false;

    const lineSummaries = sourceLines.map((line) => {
      const taxable = roundTwo(Number(line.taxableValue ?? 0));
      const rate = Number(line.gstRate ?? invoiceRate ?? 18);
      const components = calculateGstComponents({
        taxableValue: taxable,
        gstRate: rate,
        supplyState,
        customerState,
      });

      totalTaxable += taxable;
      totalCgst += components.cgst;
      totalSgst += components.sgst;
      totalIgst += components.igst;
      totalCess += components.cess;
      interState = interState || components.isInterState;

      const quantity = line.quantity ?? 1;
      const unitPrice = line.unitPrice ?? (quantity > 0 ? roundTwo(taxable / quantity) : taxable);

      return {
        description: line.description ?? null,
        hsnSacCode: line.hsnSacCode ?? null,
        quantity,
        unitPrice,
        taxableValue: taxable,
        gstRate: rate,
        cgst: components.cgst,
        sgst: components.sgst,
        igst: components.igst,
        cess: components.cess,
        metadata: line.metadata ?? {},
      };
    });

    totalTaxable = roundTwo(totalTaxable);
    totalCgst = roundTwo(totalCgst);
    totalSgst = roundTwo(totalSgst);
    totalIgst = roundTwo(totalIgst);
    totalCess = roundTwo(totalCess);
    const totalTax = roundTwo(totalCgst + totalSgst + totalIgst + totalCess);

    const invoicePayload = {
      entity_id: body.entityId,
      invoice_number: baseInvoice?.invoiceNumber ?? existingInvoice?.invoice_number,
      invoice_date: baseInvoice?.invoiceDate ?? existingInvoice?.invoice_date ?? new Date().toISOString().slice(0, 10),
      customer_name: baseInvoice?.customerName ?? existingInvoice?.customer_name ?? null,
      customer_identifier: baseInvoice?.customerIdentifier ?? existingInvoice?.customer_identifier ?? null,
      customer_state_code: customerState,
      gst_rate: invoiceRate,
      taxable_value: totalTaxable,
      total_tax: totalTax,
      cgst_amount: totalCgst,
      sgst_amount: totalSgst,
      igst_amount: totalIgst,
      cess_amount: totalCess,
      place_of_supply: supplyState,
      gst_status: baseInvoice?.status ?? existingInvoice?.gst_status ?? "pending",
      source: existingInvoice?.source ?? "manual",
      metadata: {
        ...(existingInvoice?.metadata ?? {}),
        ...(baseInvoice?.metadata ?? {}),
      },
    };

    let invoiceRecord = existingInvoice ?? null;

    if (invoiceId) {
      const { data: updatedInvoice, error: updateError } = await supabase
        .from("gst_invoices")
        .update(invoicePayload)
        .eq("id", invoiceId)
        .eq("entity_id", body.entityId)
        .select("*")
        .single();
      if (updateError) throw updateError;
      invoiceRecord = updatedInvoice;
    } else {
      const { data: insertedInvoice, error: insertInvoiceError } = await supabase
        .from("gst_invoices")
        .insert({
          ...invoicePayload,
          invoice_number: invoicePayload.invoice_number ?? `GST-${Date.now()}`,
        })
        .select("*")
        .single();
      if (insertInvoiceError) throw insertInvoiceError;
      invoiceRecord = insertedInvoice;
      invoiceId = insertedInvoice?.id ?? null;
    }

    if (!invoiceId || !invoiceRecord) {
      return jsonResponse({ error: "Failed to persist invoice record" }, { status: 500 });
    }

    if (manualLines) {
      await supabase
        .from("gst_invoice_items")
        .delete()
        .eq("invoice_id", invoiceId)
        .eq("source", "manual");

      const itemPayloads = lineSummaries.map((line) => ({
        invoice_id: invoiceId,
        stripe_line_item_id: null,
        description: line.description,
        hsn_sac_code: line.hsnSacCode,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        taxable_value: line.taxableValue,
        gst_rate: line.gstRate,
        cgst_amount: line.cgst,
        sgst_amount: line.sgst,
        igst_amount: line.igst,
        cess_amount: line.cess,
        source: "manual",
        metadata: line.metadata ?? {},
      }));

      if (itemPayloads.length) {
        const { error: insertItemsError } = await supabase
          .from("gst_invoice_items")
          .insert(itemPayloads);
        if (insertItemsError) throw insertItemsError;
      }
    }

    const { error: calcInsertError } = await supabase
      .from("gst_calculations")
      .insert({
        entity_id: body.entityId,
        invoice_id: invoiceId,
        trigger_source: triggerSource,
        performed_by: performedBy,
        input_payload: {
          invoiceId,
          overrideRate: body.overrideRate ?? null,
          lineItemsProvided: Boolean(manualLines),
          supplyState,
          customerState,
        },
        result_payload: {
          taxableValue: totalTaxable,
          totalTax,
          cgst: totalCgst,
          sgst: totalSgst,
          igst: totalIgst,
          cess: totalCess,
          isInterState: interState,
        },
      });
    if (calcInsertError) throw calcInsertError;

    const beforeSnapshot = existingInvoice
      ? {
        taxable_value: existingInvoice.taxable_value,
        cgst_amount: existingInvoice.cgst_amount,
        sgst_amount: existingInvoice.sgst_amount,
        igst_amount: existingInvoice.igst_amount,
      }
      : null;

    const { error: auditError } = await supabase
      .from("gst_audit_trail")
      .insert({
        entity_id: body.entityId,
        actor_id: performedBy,
        actor_type: performedBy ? "user" : "system",
        target_table: "gst_invoices",
        target_id: invoiceId,
        action: existingInvoice ? "recalculate" : "calculate",
        change_summary: {
          taxable_value: { before: beforeSnapshot?.taxable_value ?? null, after: totalTaxable },
          total_tax: { before: beforeSnapshot?.cgst_amount ?? null, after: totalTax },
        },
        diff: {
          before: beforeSnapshot,
          after: {
            taxable_value: totalTaxable,
            cgst_amount: totalCgst,
            sgst_amount: totalSgst,
            igst_amount: totalIgst,
          },
        },
      });
    if (auditError) throw auditError;

    return jsonResponse({
      status: "success",
      invoiceId,
      totals: {
        taxableValue: totalTaxable,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        cess: totalCess,
        totalTax,
        isInterState: interState,
      },
      lineItems: lineSummaries,
    });
  } catch (error) {
    console.error("[gst-calculate]", error);
    return jsonResponse({ error: (error as Error).message }, { status: 500 });
  }
});

