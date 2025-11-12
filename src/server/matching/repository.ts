import { supabaseAdmin } from "../db/supabaseAdmin.ts";
import type {
  DuplicateCandidate,
  GoodsReceiptPayload,
  InvoicePayload,
  MatchFeedbackPayload,
  MatchingPersistencePayload,
  PurchaseOrderPayload,
  VendorStats,
} from "./types.ts";

export async function fetchInvoiceById(invoiceId: string, workspaceId: string): Promise<InvoicePayload | null> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("id, amount, due_date, invoice_number, description, created_at")
    .eq("id", invoiceId)
    .eq("user_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("[Matching][Repository] fetchInvoiceById error", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    amount: Number(data.amount),
    dueDate: data.due_date ?? undefined,
    invoiceNumber: data.invoice_number ?? undefined,
    vendorName: data.description ?? "Unknown Vendor",
  };
}

export async function fetchPurchaseOrderById(purchaseOrderId: string, workspaceId: string): Promise<PurchaseOrderPayload | null> {
  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .select("id, supplier_name, grand_total, payment_terms, transaction_date")
    .eq("id", purchaseOrderId)
    .eq("user_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("[Matching][Repository] fetchPurchaseOrderById error", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    amount: Number(data.grand_total),
    vendorName: data.supplier_name,
    paymentTerms: data.payment_terms ?? undefined,
    issueDate: data.transaction_date ?? undefined,
  };
}

export async function fetchGoodsReceiptById(goodsReceiptId: string, workspaceId: string): Promise<GoodsReceiptPayload | null> {
  const { data, error } = await supabaseAdmin
    .from("goods_receipts")
    .select("id, purchase_order_id, supplier_name, receipt_date")
    .eq("id", goodsReceiptId)
    .eq("user_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("[Matching][Repository] fetchGoodsReceiptById error", error);
    return null;
  }

  if (!data) return null;

  const { data: lines } = await supabaseAdmin
    .from("goods_receipt_lines")
    .select("sku, description, quantity")
    .eq("goods_receipt_id", data.id);

  return {
    id: data.id,
    purchaseOrderId: data.purchase_order_id ?? undefined,
    vendorName: data.supplier_name ?? undefined,
    receiptDate: data.receipt_date ?? undefined,
    lineItems: lines?.map((line) => ({
      sku: line.sku ?? undefined,
      description: line.description ?? undefined,
      quantity: Number(line.quantity ?? 0),
    })),
  };
}

export async function fetchLatestOCRConfidence(invoiceId: string): Promise<number | null> {
  if (!invoiceId) return null;
  const { data, error } = await supabaseAdmin
    .from("invoice_ocr_extractions")
    .select("overall_confidence")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Matching][Repository] fetchLatestOCRConfidence error", error);
    return null;
  }

  return data?.overall_confidence ? Number(data.overall_confidence) : null;
}

export async function fetchVendorStats(workspaceId: string, vendorName: string): Promise<VendorStats | null> {
  const { data, error } = await supabaseAdmin.rpc("get_vendor_invoice_stats", {
    p_workspace_id: workspaceId,
    p_vendor_name: vendorName,
  });

  if (error) {
    console.warn("[Matching][Repository] get_vendor_invoice_stats missing, using fallback aggregation");
  }

  if (Array.isArray(data) && data.length > 0) {
    const stats = data[0];
    return {
      vendorName,
      count: stats.count,
      meanAmount: stats.mean_amount,
      stdDevAmount: stats.std_dev_amount,
      approvalRate: stats.approval_rate,
    };
  }

  const { data: fallback, error: fallbackError } = await supabaseAdmin
    .from("purchase_orders")
    .select("grand_total")
    .eq("user_id", workspaceId)
    .eq("supplier_name", vendorName);

  if (fallbackError) {
    console.error("[Matching][Repository] fallback vendor stats error", fallbackError);
    return null;
  }

  if (!fallback || fallback.length === 0) {
    return null;
  }

  const amounts = fallback.map((row) => Number(row.grand_total ?? 0));
  const meanAmount = amounts.reduce((acc, value) => acc + value, 0) / amounts.length;
  const variance =
    amounts.reduce((acc, value) => acc + (value - meanAmount) ** 2, 0) / Math.max(amounts.length - 1, 1);
  const stdDevAmount = Math.sqrt(variance);

  return {
    vendorName,
    count: amounts.length,
    meanAmount,
    stdDevAmount,
  };
}

export async function fetchDuplicateCandidates(
  workspaceId: string,
  vendorName: string,
  amount: number,
  fromDate?: string,
  toDate?: string,
): Promise<DuplicateCandidate[]> {
  const { data, error } = await supabaseAdmin
    .from("invoice_matches")
    .select("invoice_id, vendor_name, metadata")
    .eq("workspace_id", workspaceId)
    .eq("vendor_name", vendorName)
    .gte("created_at", fromDate ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .lte("created_at", toDate ?? new Date().toISOString());

  if (error) {
    console.error("[Matching][Repository] fetchDuplicateCandidates error", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    invoiceId: row.invoice_id ?? undefined,
    vendorName: row.vendor_name ?? vendorName,
    amount: Number(row.metadata?.invoiceAmount ?? amount),
    invoiceDate: row.metadata?.invoiceDate ?? undefined,
    invoiceNumber: row.metadata?.invoiceNumber ?? undefined,
  }));
}

export async function persistMatchingResult(payload: MatchingPersistencePayload) {
  const { error, data } = await supabaseAdmin
    .from("invoice_matches")
    .insert({
      workspace_id: payload.workspaceId,
      invoice_id: payload.invoiceId,
      purchase_order_id: payload.purchaseOrderId,
      goods_receipt_id: payload.goodsReceiptId,
      vendor_name: payload.vendorName,
      match_type: payload.matchType,
      confidence_score: payload.confidenceScore,
      flagged_reasons: payload.flaggedReasons,
      requires_approval: payload.requiresApproval,
      amount_variance: payload.amountVariance,
      quantity_variance: payload.quantityVariance,
      payment_terms_variance: payload.paymentTermsVariance,
      duplicate_suspected: payload.duplicateSuspected,
      metadata: payload.metadata,
      created_by: payload.userId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to persist invoice match: ${error.message}`);
  }

  await refreshVendorProfile(payload.workspaceId, payload.vendorName);

  return data?.id as string;
}

export async function listPendingApprovals(workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from("invoice_matches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("requires_approval", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list pending approvals: ${error.message}`);
  }

  return data ?? [];
}

export async function persistMatchFeedback(payload: MatchFeedbackPayload) {
  const { error } = await supabaseAdmin.from("invoice_match_feedback").insert({
    invoice_match_id: payload.invoiceMatchId,
    workspace_id: payload.workspaceId,
    vendor_name: payload.vendorName,
    reviewer_id: payload.reviewerId,
    is_correct: payload.isCorrect,
    feedback_notes: payload.feedbackNotes ?? null,
    approved_amount: payload.approvedAmount ?? null,
    approved_quantity: payload.approvedQuantity ?? null,
  });

  if (error) {
    throw new Error(`Failed to persist match feedback: ${error.message}`);
  }

  await refreshVendorProfile(payload.workspaceId, payload.vendorName);
}

export async function refreshVendorProfile(workspaceId: string, vendorName: string) {
  const { error } = await supabaseAdmin.rpc("refresh_vendor_matching_profile", {
    p_workspace_id: workspaceId,
    p_vendor_name: vendorName,
  });

  if (error) {
    console.error("[Matching][Repository] Failed to refresh vendor profile", error);
  }
}

