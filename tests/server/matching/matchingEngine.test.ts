import { describe, expect, it, vi } from "vitest";
import { MatchingEngine } from "@/server/matching/matchingEngine.ts";
import type {
  DuplicateCandidate,
  MatchingPersistencePayload,
  VendorStats,
} from "@/server/matching/types.ts";

const vendorStats: VendorStats = {
  vendorName: "Acme Supplies",
  count: 20,
  meanAmount: 1000,
  stdDevAmount: 40,
  approvalRate: 0.85,
};

const baseDependencies = () => {
  const persistMatchingResult = vi.fn(async (payload: MatchingPersistencePayload) => {
    expect(payload.vendorName).toBe("Acme Supplies");
    return "match-001";
  });

  return {
    fetchVendorStats: vi.fn(async () => vendorStats),
    fetchDuplicateCandidates: vi.fn(async () => [] as DuplicateCandidate[]),
    persistMatchingResult,
  };
};

describe("MatchingEngine", () => {
  it("classifies a perfect three-way match", async () => {
    const deps = baseDependencies();
    const engine = new MatchingEngine(deps);

    const { result } = await engine.match({
      workspaceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      invoice: {
        vendorName: "Acme Supplies",
        amount: 1010,
        quantity: 100,
        invoiceNumber: "INV-100",
        issueDate: "2025-01-15",
        paymentTerms: "Net 30",
        ocrConfidence: 0.95,
      },
      purchaseOrder: {
        vendorName: "Acme Supplies",
        amount: 1000,
        quantity: 100,
        paymentTerms: "Net 30",
        issueDate: "2025-01-10",
      },
      goodsReceipt: {
        vendorName: "Acme Supplies",
        receiptDate: "2025-01-14",
        lineItems: [{ quantity: 100 }],
      },
    });

    expect(result.matchType).toBe("3_way");
    expect(result.requiresApproval).toBe(false);
    expect(result.flaggedReasons).toHaveLength(0);
    expect(result.confidenceScore).toBeGreaterThan(80);
  });

  it("flags partial match when quantities differ", async () => {
    const deps = baseDependencies();
    const engine = new MatchingEngine(deps);

    const { result } = await engine.match({
      workspaceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      invoice: {
        vendorName: "Acme Supplies",
        amount: 1000,
        quantity: 90,
        invoiceNumber: "INV-200",
        issueDate: "2025-01-15",
        paymentTerms: "Net 30",
      },
      purchaseOrder: {
        vendorName: "Acme Supplies",
        amount: 1000,
        quantity: 100,
        paymentTerms: "Net 30",
        issueDate: "2025-01-10",
      },
      goodsReceipt: {
        vendorName: "Acme Supplies",
        receiptDate: "2025-01-16",
        lineItems: [{ quantity: 100 }],
      },
    });

    expect(result.matchType).toBe("partial");
    expect(result.flaggedReasons).toContain("quantity_variance");
    expect(result.requiresApproval).toBe(true);
  });

  it("detects duplicate invoices using fuzzy matching", async () => {
    const deps = baseDependencies();
    deps.fetchDuplicateCandidates = vi.fn(async () => [
      { vendorName: "Acme Supplies", amount: 1000, invoiceNumber: "INV-300", invoiceDate: "2025-01-12" },
    ]);

    const engine = new MatchingEngine(deps);

    const { result } = await engine.match({
      workspaceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      invoice: {
        vendorName: "Acme Supplies",
        amount: 1000,
        invoiceNumber: "INV-300",
        issueDate: "2025-01-12",
        paymentTerms: "Net 30",
      },
      purchaseOrder: {
        vendorName: "Acme Supplies",
        amount: 1000,
        issueDate: "2025-01-10",
        paymentTerms: "Net 30",
      },
      goodsReceipt: undefined,
    });

    expect(result.duplicateSuspected).toBe(true);
    expect(result.flaggedReasons).toContain("duplicate_invoice");
  });

  it("flags missing purchase orders and date anomalies", async () => {
    const deps = baseDependencies();
    const engine = new MatchingEngine(deps);

    const { result } = await engine.match({
      workspaceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      invoice: {
        vendorName: "Acme Supplies",
        amount: 1200,
        invoiceNumber: "INV-999",
        issueDate: "2025-01-01",
      },
      purchaseOrder: {
        vendorName: "Acme Supplies",
      amount: Number.NaN,
        issueDate: "2025-01-10",
      paymentTerms: "Net 30",
      },
      goodsReceipt: undefined,
    });

    expect(result.flaggedReasons).toEqual(expect.arrayContaining(["missing_po", "date_anomaly"]));
    expect(result.requiresApproval).toBe(true);
  });
});

