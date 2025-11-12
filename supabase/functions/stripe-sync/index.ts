import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { calculateGstComponents } from "../_shared/gst.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StripeInvoice = {
  id: string;
  number: string | null;
  created: number;
  status: string;
  customer: string | null;
  customer_tax_ids?: Array<{ value: string }>;
  customer_address?: { state?: string | null };
  customer_shipping?: { address?: { state?: string | null } };
  metadata?: Record<string, string>;
  amount_subtotal?: number;
  amount_due?: number;
  currency?: string;
  lines?: { data: StripeInvoiceLine[] };
};

type StripeInvoiceLine = {
  id: string;
  description: string | null;
  quantity?: number | null;
  amount_subtotal?: number | null;
  amount_tax?: number | null;
  currency?: string | null;
  tax_rates?: Array<{ percentage?: number | null }>;
  metadata?: Record<string, string>;
};

type StripePaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoice?: string | null;
  created: number;
  metadata?: Record<string, string>;
};

interface SyncRequestBody {
  entityId: string;
  jobId?: string;
  mode?: "full" | "incremental";
  startingAfter?: string;
  since?: string;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

async function fetchStripeCollection<T>(
  endpoint: string,
  secretKey: string,
  baseParams: Array<[string, string]> = [],
  dynamicParams: Record<string, string | undefined> = {},
): Promise<T[]> {
  const items: T[] = [];
  let startingAfter: string | undefined = dynamicParams.starting_after;
  let hasMore = true;

  while (hasMore) {
    const search = new URLSearchParams([["limit", "100"], ...baseParams]);
    for (const [key, value] of Object.entries(dynamicParams)) {
      if (key === "starting_after") continue;
      if (value) search.append(key, value);
    }
    if (startingAfter) search.set("starting_after", startingAfter);

    const response = await fetch(`${endpoint}?${search.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(`Stripe API error ${response.status}: ${errorPayload}`);
    }

    const payload = await response.json();
    const data: T[] = payload.data ?? [];
    items.push(...data);

    hasMore = payload.has_more ?? false;
    startingAfter = hasMore && data.length > 0 ? (data[data.length - 1] as any).id : undefined;
  }

  return items;
}

function centsToRupees(value?: number | null): number {
  if (value === null || value === undefined) return 0;
  return Math.round((value / 100 + Number.EPSILON) * 100) / 100;
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
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!supabaseUrl || !supabaseKey || !stripeSecretKey) {
    return jsonResponse({ error: "Missing environment configuration" }, { status: 500 });
  }

  let body: SyncRequestBody;
  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.entityId) {
    return jsonResponse({ error: "entityId is required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();
  let jobId: string | null = body.jobId ?? null;
  let entityId = body.entityId;

  try {

    if (jobId) {
      const { data: existingJob, error: jobFetchError } = await supabase
        .from("stripe_sync_jobs")
        .select("entity_id, attempts")
        .eq("id", jobId)
        .maybeSingle();

      if (jobFetchError) throw jobFetchError;
      if (!existingJob) {
        return jsonResponse({ error: "Sync job not found" }, { status: 404 });
      }
      if (entityId && existingJob.entity_id && existingJob.entity_id !== entityId) {
        return jsonResponse({ error: "Entity mismatch for job" }, { status: 400 });
      }
      entityId = existingJob.entity_id ?? entityId;

      const { error: jobStartError } = await supabase
        .from("stripe_sync_jobs")
        .update({
          entity_id: entityId,
          status: "processing",
          attempts: (existingJob.attempts ?? 0) + 1,
          started_at: startedAt,
          finished_at: null,
          last_error: null,
        })
        .eq("id", jobId);
      if (jobStartError) throw jobStartError;
    } else {
      const { data: insertedJob, error: insertJobError } = await supabase
        .from("stripe_sync_jobs")
        .insert({
          entity_id: entityId,
          job_type: body.mode === "incremental" ? "incremental_sync" : "full_sync",
          status: "processing",
          attempts: 1,
          started_at: startedAt,
        })
        .select("id")
        .single();
      if (insertJobError) throw insertJobError;
      jobId = insertedJob?.id ?? null;
    }

    const { data: entity, error: entityError } = await supabase
      .from("gst_entities")
      .select("id, state_code, settings")
      .eq("id", entityId)
      .maybeSingle();

    if (entityError) {
      throw entityError;
    }
    if (!entity) {
      return jsonResponse({ error: "GST entity not found" }, { status: 404 });
    }

    const invoiceBaseParams: Array<[string, string]> = [
      ["expand[]", "data.lines"],
      ["expand[]", "data.customer"],
    ];
    const invoiceDynamicParams: Record<string, string | undefined> = {};
    if (body.since) invoiceDynamicParams["created[gte]"] = body.since;
    if (body.startingAfter) invoiceDynamicParams.starting_after = body.startingAfter;

    const invoices = await fetchStripeCollection<StripeInvoice>(
      "https://api.stripe.com/v1/invoices",
      stripeSecretKey,
      invoiceBaseParams,
      invoiceDynamicParams,
    );

    const paymentDynamicParams: Record<string, string | undefined> = {};
    if (body.since) paymentDynamicParams["created[gte]"] = body.since;
    if (body.startingAfter) paymentDynamicParams.starting_after = body.startingAfter;

    const payments = await fetchStripeCollection<StripePaymentIntent>(
      "https://api.stripe.com/v1/payment_intents",
      stripeSecretKey,
      [],
      paymentDynamicParams,
    );

    let invoicesSynced = 0;
    let paymentsSynced = 0;

    for (const invoice of invoices) {
      await supabase.from("stripe_invoices_raw").upsert({
        entity_id: entityId,
        stripe_invoice_id: invoice.id,
        payload: invoice,
        synced_at: new Date().toISOString(),
      });

      const invoiceNumber = invoice.number ?? invoice.id;
      const taxableValue = centsToRupees(invoice.amount_subtotal ?? 0);
      const gstRate = Number(invoice.metadata?.gst_rate ?? entity.settings?.default_gst_rate ?? 18);
      const customerState = invoice.customer_shipping?.address?.state
        ?? invoice.customer_address?.state
        ?? invoice.metadata?.customer_state
        ?? null;
      const supplyState = entity.state_code ?? invoice.metadata?.supply_state ?? null;

      const gstComponents = calculateGstComponents({
        taxableValue,
        gstRate,
        supplyState,
        customerState,
      });

      const invoiceUpsert = {
        entity_id: entityId,
        invoice_number: invoiceNumber,
        invoice_date: new Date(invoice.created * 1000).toISOString().slice(0, 10),
        customer_name: invoice.metadata?.customer_name ?? null,
        customer_identifier: invoice.customer ?? null,
        customer_state_code: customerState,
        gst_rate: gstRate,
        taxable_value: taxableValue,
        total_tax: gstComponents.totalTax,
        cgst_amount: gstComponents.cgst,
        sgst_amount: gstComponents.sgst,
        igst_amount: gstComponents.igst,
        cess_amount: gstComponents.cess,
        place_of_supply: supplyState,
        gst_status: invoice.status ?? "pending",
        source: "stripe",
        stripe_invoice_id: invoice.id,
        metadata: invoice.metadata ?? {},
      };

      const { data: upsertedInvoice } = await supabase
        .from("gst_invoices")
        .upsert(invoiceUpsert, { onConflict: "entity_id,invoice_number" })
        .select("id")
        .single();

      const invoiceId = upsertedInvoice?.id;

      if (invoiceId && invoice.lines?.data?.length) {
        const lineItems = invoice.lines.data.map((line) => {
          const lineTaxable = centsToRupees(line.amount_subtotal ?? 0);
          const lineRate = Number(
            line.metadata?.gst_rate
            ?? line.tax_rates?.[0]?.percentage
            ?? gstRate,
          );
          const lineComponents = calculateGstComponents({
            taxableValue: lineTaxable,
            gstRate: lineRate,
            supplyState,
            customerState,
          });

          return {
            stripe_line_item_id: line.id,
            invoice_id: invoiceId,
            description: line.description,
            hsn_sac_code: line.metadata?.hsn_sac ?? null,
            quantity: line.quantity ?? 1,
            unit_price: line.quantity && line.quantity > 0
              ? centsToRupees((line.amount_subtotal ?? 0) / (line.quantity ?? 1))
              : centsToRupees(line.amount_subtotal ?? 0),
            taxable_value: lineTaxable,
            gst_rate: lineRate,
            cgst_amount: lineComponents.cgst,
            sgst_amount: lineComponents.sgst,
            igst_amount: lineComponents.igst,
            cess_amount: lineComponents.cess,
            source: "stripe",
            metadata: line.metadata ?? {},
          };
        });

        if (lineItems.length) {
          await supabase
            .from("gst_invoice_items")
            .delete()
            .eq("invoice_id", invoiceId)
            .eq("source", "stripe");

          await supabase
            .from("gst_invoice_items")
            .insert(lineItems);
        }
      }

      await supabase.from("gst_calculations").insert({
        entity_id: entityId,
        invoice_id: invoiceId,
        trigger_source: "stripe_sync",
        input_payload: {
          stripe_invoice_id: invoice.id,
          customer_state: customerState,
          supply_state: supplyState,
          gst_rate: gstRate,
        },
        result_payload: gstComponents,
      });

      invoicesSynced += 1;
    }

    for (const payment of payments) {
      await supabase.from("stripe_payments_raw").upsert({
        entity_id: body.entityId,
        stripe_payment_intent_id: payment.id,
        payload: payment,
        synced_at: new Date().toISOString(),
      });

      let linkedInvoiceId: string | null = null;
      if (payment.invoice) {
        const { data: invoiceRow } = await supabase
          .from("gst_invoices")
          .select("id")
          .eq("stripe_invoice_id", payment.invoice)
          .maybeSingle();
        linkedInvoiceId = invoiceRow?.id ?? null;
      }

      await supabase
        .from("gst_payments")
        .upsert({
          entity_id: entityId,
          stripe_payment_intent_id: payment.id,
          amount: centsToRupees(payment.amount),
          currency: payment.currency ?? "inr",
          status: payment.status,
          paid_at: new Date(payment.created * 1000).toISOString(),
          metadata: payment.metadata ?? {},
          invoice_id: linkedInvoiceId,
        }, { onConflict: "entity_id,stripe_payment_intent_id" });

      paymentsSynced += 1;
    }

    const finishedAt = new Date().toISOString();

    if (jobId) {
      const summary = {
        invoicesSynced,
        paymentsSynced,
        mode: body.mode ?? "full",
      };

      await supabase
        .from("stripe_sync_jobs")
        .update({
          status: "completed",
          finished_at: finishedAt,
          last_error: null,
          cursor_invoices: invoices.at(-1)?.id ?? null,
          cursor_payments: payments.at(-1)?.id ?? null,
          result_summary: summary,
        })
        .eq("id", jobId);
    }

    return jsonResponse({
      status: "success",
      invoicesSynced,
      paymentsSynced,
    });
  } catch (error) {
    console.error("[stripe-sync]", error);

    const finishedAt = new Date().toISOString();
    const message = (error as Error).message;

    if (jobId) {
      await supabase
        .from("stripe_sync_jobs")
        .update({
          status: "failed",
          finished_at: finishedAt,
          last_error: message,
        })
        .eq("id", jobId);
    }

    return jsonResponse({ error: (error as Error).message }, { status: 500 });
  }
});
