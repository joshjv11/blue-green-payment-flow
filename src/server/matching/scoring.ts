import { differenceInCalendarDays } from "date-fns";
import { distance as levenshteinDistance } from "fastest-levenshtein";
import Fuse from "fuse.js";
import { zScore } from "simple-statistics";
import type {
  InvoicePayload,
  MatchingContext,
  MatchingResult,
  PurchaseOrderPayload,
  VendorStats,
} from "./types.ts";

const AMOUNT_VARIANCE_TOLERANCE = 0.02;
const QUANTITY_VARIANCE_TOLERANCE = 0.05;

export function computeAmountVariance(invoice: InvoicePayload, purchaseOrder: PurchaseOrderPayload) {
  if (!invoice.amount || !purchaseOrder.amount) return Infinity;
  return Math.abs(invoice.amount - purchaseOrder.amount) / purchaseOrder.amount;
}

export function computeQuantityVariance(
  invoice: InvoicePayload,
  goodsReceiptQuantity?: number,
  purchaseOrderQuantity?: number,
) {
  const invoiceQuantity =
    invoice.quantity ??
    invoice.lineItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) ??
    null;
  if (!invoiceQuantity || !goodsReceiptQuantity) return null;
  const baseline = purchaseOrderQuantity ?? goodsReceiptQuantity;
  return Math.abs(invoiceQuantity - goodsReceiptQuantity) / Math.max(baseline, 1);
}

export function determineMatchType(
  amountVariance: number,
  quantityVariance: number | null,
): { type: MatchingResult["matchType"]; partial: boolean } {
  if (amountVariance <= AMOUNT_VARIANCE_TOLERANCE && (quantityVariance === null || quantityVariance <= QUANTITY_VARIANCE_TOLERANCE)) {
    return { type: quantityVariance === null ? "2_way" : "3_way", partial: false };
  }
  if (amountVariance <= AMOUNT_VARIANCE_TOLERANCE) {
    return { type: "partial", partial: true };
  }
  return { type: "unmatched", partial: false };
}

export function computeVendorNameSimilarity(invoiceVendor: string, poVendor: string) {
  const normalizedInvoice = invoiceVendor.trim().toLowerCase();
  const normalizedPO = poVendor.trim().toLowerCase();
  if (normalizedInvoice === normalizedPO) return 1;
  const fuse = new Fuse([normalizedPO], { includeScore: true, threshold: 0.4 });
  const result = fuse.search(normalizedInvoice)[0];
  if (result) {
    return 1 - (result.score ?? 0);
  }
  const maxLen = Math.max(normalizedInvoice.length, normalizedPO.length) || 1;
  const distance = levenshteinDistance(normalizedInvoice, normalizedPO);
  return 1 - distance / maxLen;
}

export function computeConfidenceScore(params: {
  invoice: InvoicePayload;
  purchaseOrder: PurchaseOrderPayload;
  amountVariance: number;
  quantityVariance: number | null;
  vendorStats?: VendorStats | null;
  vendorSimilarity: number;
}): number {
  const { invoice, amountVariance, quantityVariance, vendorStats, vendorSimilarity } = params;
  const baseScore = 100;

  const amountScore = Math.max(0, 100 - (amountVariance * 100) / AMOUNT_VARIANCE_TOLERANCE);

  const quantityScore =
    quantityVariance === null
      ? 100
      : Math.max(0, 100 - (quantityVariance * 100) / QUANTITY_VARIANCE_TOLERANCE);

  const ocrConfidence = invoice.ocrConfidence ?? 0.7;
  const ocrScore = Math.min(100, Math.max(20, ocrConfidence * 100));

  const vendorAccuracy = vendorStats?.approvalRate ?? 0.8;
  const vendorScore = vendorAccuracy * 100;

  const vendorNameScore = vendorSimilarity * 100;

  const weightedScore =
    baseScore * 0.05 +
    amountScore * 0.35 +
    quantityScore * 0.15 +
    ocrScore * 0.15 +
    vendorScore * 0.2 +
    vendorNameScore * 0.1;

  return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

export function detectAmountAnomaly(invoiceAmount: number, vendorStats?: VendorStats | null) {
  if (!vendorStats || vendorStats.count < 5 || !vendorStats.stdDevAmount || vendorStats.stdDevAmount === 0) {
    return { isAnomalous: false, z: 0 };
  }
  const z = zScore(invoiceAmount, vendorStats.meanAmount, vendorStats.stdDevAmount);
  const isAnomalous = Math.abs(z) >= 3;
  return { isAnomalous, z };
}

export function evaluatePaymentTermsVariance(invoiceTerms?: string, poTerms?: string) {
  if (!invoiceTerms || !poTerms) return false;
  const normalizedInvoice = invoiceTerms.trim().toLowerCase();
  const normalizedPo = poTerms.trim().toLowerCase();
  return normalizedInvoice !== normalizedPo;
}

export function detectDateAnomaly(
  invoiceDate?: string,
  poDate?: string,
  goodsReceiptDate?: string,
) {
  if (!invoiceDate) {
    return { isAnomalous: false, varianceDays: 0 };
  }

  const invoice = new Date(invoiceDate);
  let varianceDays = 0;
  let isAnomalous = false;

  if (poDate) {
    const po = new Date(poDate);
    const delta = differenceInCalendarDays(invoice, po);
    if (delta < -3) {
      isAnomalous = true;
      varianceDays = delta;
    }
  }

  if (goodsReceiptDate) {
    const gr = new Date(goodsReceiptDate);
    const delta = differenceInCalendarDays(invoice, gr);
    if (delta > 30) {
      isAnomalous = true;
      varianceDays = delta;
    }
  }

  return { isAnomalous, varianceDays };
}

export function collectFlaggedReasons(context: {
  matchType: MatchingResult["matchType"];
  amountVariance: number;
  quantityVariance: number | null;
  amountAnomaly: boolean;
  amountZScore: number;
  duplicateSuspected: boolean;
  paymentTermsVariance: boolean;
  vendorSimilarity: number;
  isNewVendor: boolean;
  dateAnomaly: boolean;
  missingPurchaseOrder: boolean;
}): string[] {
  const reasons: string[] = [];
  if (context.matchType === "unmatched") {
    if (context.amountVariance > AMOUNT_VARIANCE_TOLERANCE) reasons.push("price_variance");
    if (context.quantityVariance !== null && context.quantityVariance > QUANTITY_VARIANCE_TOLERANCE) reasons.push("quantity_variance");
  }
  if (context.amountAnomaly) {
    reasons.push("amount_anomaly");
  }
  if (context.duplicateSuspected) {
    reasons.push("duplicate_invoice");
  }
  if (context.paymentTermsVariance) {
    reasons.push("payment_terms_variance");
  }
  if (context.vendorSimilarity < 0.7) {
    reasons.push("vendor_name_variance");
  }
  if (context.isNewVendor) {
    reasons.push("new_vendor_risk");
  }
  if (context.dateAnomaly) {
    reasons.push("date_anomaly");
  }
  if (context.missingPurchaseOrder) {
    reasons.push("missing_po");
  }
  return reasons;
}

