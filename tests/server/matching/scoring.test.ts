import { describe, expect, it } from "vitest";
import {
  collectFlaggedReasons,
  computeAmountVariance,
  computeConfidenceScore,
  computeVendorNameSimilarity,
  detectAmountAnomaly,
  detectDateAnomaly,
  determineMatchType,
} from "@/server/matching/scoring.ts";
import type { InvoicePayload, PurchaseOrderPayload, VendorStats } from "@/server/matching/types.ts";

const invoice: InvoicePayload = {
  vendorName: "Acme Supplies Pvt Ltd",
  amount: 1000,
  quantity: 50,
  ocrConfidence: 0.92,
};

const purchaseOrder: PurchaseOrderPayload = {
  vendorName: "Acme Supplies Private Limited",
  amount: 995,
  quantity: 50,
};

const vendorStats: VendorStats = {
  vendorName: invoice.vendorName,
  count: 24,
  meanAmount: 980,
  stdDevAmount: 35,
  approvalRate: 0.9,
};

describe("matching scoring primitives", () => {
  it("identifies match types based on variance thresholds", () => {
    const amountVariance = computeAmountVariance(invoice, purchaseOrder);
    const { type } = determineMatchType(amountVariance, 0.01);
    expect(type).toBe("3_way");

    const { type: partial } = determineMatchType(amountVariance, 0.12);
    expect(partial).toBe("partial");
  });

  it("computes confidence score using weighted signals", () => {
    const variance = computeAmountVariance(invoice, purchaseOrder);
    const similarity = computeVendorNameSimilarity(invoice.vendorName, purchaseOrder.vendorName);
    const score = computeConfidenceScore({
      invoice,
      purchaseOrder,
      amountVariance: variance,
      quantityVariance: 0.02,
      vendorStats,
      vendorSimilarity: similarity,
    });
    expect(score).toBeGreaterThan(80);
  });

  it("flags amount anomalies using z-score", () => {
    const anomaly = detectAmountAnomaly(1500, vendorStats);
    expect(anomaly.isAnomalous).toBe(true);
    expect(anomaly.z).toBeLessThan(-3);
  });

  it("detects date anomalies when invoice predates PO by several days", () => {
    const { isAnomalous, varianceDays } = detectDateAnomaly("2025-02-01", "2025-02-10", undefined);
    expect(isAnomalous).toBe(true);
    expect(varianceDays).toBeLessThan(0);
  });

  it("aggregates flagged reasons consistently", () => {
    const reasons = collectFlaggedReasons({
      matchType: "unmatched",
      amountVariance: 0.2,
      quantityVariance: 0.08,
      amountAnomaly: true,
      amountZScore: 3.5,
      duplicateSuspected: true,
      paymentTermsVariance: false,
      vendorSimilarity: 0.5,
      isNewVendor: true,
      dateAnomaly: true,
      missingPurchaseOrder: true,
    });

    expect(reasons).toEqual(
      expect.arrayContaining([
        "price_variance",
        "quantity_variance",
        "amount_anomaly",
        "duplicate_invoice",
        "vendor_name_variance",
        "new_vendor_risk",
        "date_anomaly",
        "missing_po",
      ]),
    );
  });
});

