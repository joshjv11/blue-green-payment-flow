import Fuse from "fuse.js";
import { subDays } from "date-fns";
import {
  fetchDuplicateCandidates,
  fetchGoodsReceiptById,
  fetchInvoiceById,
  fetchLatestOCRConfidence,
  fetchPurchaseOrderById,
  fetchVendorStats,
  listPendingApprovals,
  persistMatchFeedback,
  persistMatchingResult,
} from "./repository.ts";
import {
  collectFlaggedReasons,
  computeAmountVariance,
  computeConfidenceScore,
  computeQuantityVariance,
  computeVendorNameSimilarity,
  detectAmountAnomaly,
  detectDateAnomaly,
  determineMatchType,
  evaluatePaymentTermsVariance,
} from "./scoring.ts";
import type {
  DuplicateCandidate,
  GoodsReceiptPayload,
  InvoicePayload,
  MatchFeedbackPayload,
  MatchingContext,
  MatchingPersistencePayload,
  MatchingResult,
  PurchaseOrderPayload,
} from "./types.ts";

export interface MatchingEngineDependencies {
  fetchInvoiceById?: typeof fetchInvoiceById;
  fetchPurchaseOrderById?: typeof fetchPurchaseOrderById;
  fetchGoodsReceiptById?: typeof fetchGoodsReceiptById;
  fetchLatestOCRConfidence?: typeof fetchLatestOCRConfidence;
  fetchVendorStats?: typeof fetchVendorStats;
  fetchDuplicateCandidates?: typeof fetchDuplicateCandidates;
  persistMatchingResult?: typeof persistMatchingResult;
  listPendingApprovals?: typeof listPendingApprovals;
  persistMatchFeedback?: typeof persistMatchFeedback;
}

export class MatchingEngine {
  constructor(private readonly deps: MatchingEngineDependencies = {}) {}

  private getInvoice(id: string, workspaceId: string) {
    const loader = this.deps?.fetchInvoiceById ?? fetchInvoiceById;
    return loader(id, workspaceId);
  }

  private getPurchaseOrder(id: string, workspaceId: string) {
    const loader = this.deps?.fetchPurchaseOrderById ?? fetchPurchaseOrderById;
    return loader(id, workspaceId);
  }

  private getGoodsReceipt(id: string, workspaceId: string) {
    const loader = this.deps?.fetchGoodsReceiptById ?? fetchGoodsReceiptById;
    return loader(id, workspaceId);
  }

  private getOCRConfidence(invoiceId: string) {
    const loader = this.deps?.fetchLatestOCRConfidence ?? fetchLatestOCRConfidence;
    return loader(invoiceId);
  }

  private getVendorStats(workspaceId: string, vendorName: string) {
    const loader = this.deps?.fetchVendorStats ?? fetchVendorStats;
    return loader(workspaceId, vendorName);
  }

  private getDuplicateCandidates(
    workspaceId: string,
    vendorName: string,
    amount: number,
    startDate: string,
    endDate: string,
  ) {
    const loader = this.deps?.fetchDuplicateCandidates ?? fetchDuplicateCandidates;
    return loader(workspaceId, vendorName, amount, startDate, endDate);
  }

  private persistResult(payload: MatchingPersistencePayload) {
    const writer = this.deps?.persistMatchingResult ?? persistMatchingResult;
    return writer(payload);
  }

  async match(context: MatchingContext & {
    invoiceId?: string;
    purchaseOrderId?: string;
    goodsReceiptId?: string;
  }) {
    let invoice: InvoicePayload = context.invoice;
    let purchaseOrder: PurchaseOrderPayload = context.purchaseOrder;
    let goodsReceipt: GoodsReceiptPayload | undefined | null = context.goodsReceipt;

    if (context.invoiceId) {
      const dbInvoice = await this.getInvoice(context.invoiceId, context.workspaceId);
      if (dbInvoice) invoice = { ...dbInvoice, ...invoice, id: dbInvoice.id };
      const ocrConfidence = await this.getOCRConfidence(context.invoiceId);
      if (ocrConfidence) invoice.ocrConfidence = ocrConfidence;
    }

    if (context.purchaseOrderId) {
      const dbPO = await this.getPurchaseOrder(context.purchaseOrderId, context.workspaceId);
      if (dbPO) purchaseOrder = { ...dbPO, ...purchaseOrder, id: dbPO.id };
    }

    if (context.goodsReceiptId) {
      const dbGR = await this.getGoodsReceipt(context.goodsReceiptId, context.workspaceId);
      goodsReceipt = dbGR ?? goodsReceipt;
    }

    const amountVariance = computeAmountVariance(invoice, purchaseOrder);
    const purchaseOrderQuantity =
      purchaseOrder.quantity ??
      purchaseOrder.lineItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) ??
      null;
    const goodsReceiptQuantity =
      goodsReceipt?.lineItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) ??
      purchaseOrderQuantity ??
      null;
    const quantityVariance = computeQuantityVariance(
      invoice,
      goodsReceiptQuantity ?? undefined,
      purchaseOrderQuantity ?? undefined,
    );

    const { type: matchType } = determineMatchType(amountVariance, quantityVariance);

    const vendorStats = await this.getVendorStats(context.workspaceId, invoice.vendorName);
    const vendorSimilarity = computeVendorNameSimilarity(
      invoice.vendorName,
      purchaseOrder.vendorName,
    );

    const confidenceScore = computeConfidenceScore({
      invoice,
      purchaseOrder,
      amountVariance,
      quantityVariance,
      vendorStats,
      vendorSimilarity,
    });

    const { isAnomalous, z } = detectAmountAnomaly(invoice.amount, vendorStats);
    const paymentTermsVariance = evaluatePaymentTermsVariance(
      invoice.paymentTerms,
      purchaseOrder.paymentTerms,
    );

    const { isAnomalous: dateAnomaly, varianceDays: dateVarianceDays } = detectDateAnomaly(
      invoice.issueDate ?? invoice.dueDate,
      purchaseOrder.issueDate,
      goodsReceipt?.receiptDate,
    );

    const duplicateDetection = await this.detectDuplicates({
      workspaceId: context.workspaceId,
      vendorName: invoice.vendorName,
      amount: invoice.amount,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate ?? invoice.dueDate,
    });

    const missingPurchaseOrder =
      purchaseOrder?.amount === undefined ||
      purchaseOrder?.amount === null ||
      Number.isNaN(purchaseOrder.amount) ||
      !context.purchaseOrderId;

    const flaggedReasons = collectFlaggedReasons({
      matchType,
      amountVariance,
      quantityVariance,
      amountAnomaly: isAnomalous,
      amountZScore: z,
      duplicateSuspected: duplicateDetection.duplicateSuspected,
      paymentTermsVariance,
      vendorSimilarity,
      isNewVendor: !vendorStats || vendorStats.count < 1,
      dateAnomaly,
      missingPurchaseOrder,
    });

    const requiresApproval =
      matchType !== "3_way" ||
      confidenceScore < 75 ||
      flaggedReasons.length > 0 ||
      duplicateDetection.duplicateSuspected;

    const invoiceQuantity =
      invoice.quantity ??
      invoice.lineItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) ??
      null;

    const metadata: Record<string, unknown> = {
      invoiceNumber: invoice.invoiceNumber,
      poNumber: purchaseOrder.poNumber,
      goodsReceiptId: goodsReceipt?.id,
      amountVariance,
      quantityVariance,
      amountZScore: z,
      duplicateCandidates: duplicateDetection.candidates,
      invoiceAmount: invoice.amount,
      purchaseOrderAmount: purchaseOrder.amount,
      goodsReceiptQuantity,
      invoiceQuantity,
      vendorSimilarity,
      dateVarianceDays,
      ocrConfidence: invoice.ocrConfidence,
    };

    const result: MatchingResult = {
      matchType,
      confidenceScore,
      flaggedReasons,
      requiresApproval,
      amountVariance,
      quantityVariance,
      paymentTermsVariance,
      duplicateSuspected: duplicateDetection.duplicateSuspected,
      metadata,
    };

    const persistencePayload: MatchingPersistencePayload = {
      ...result,
      workspaceId: context.workspaceId,
      userId: context.userId,
      invoiceId: context.invoiceId ?? invoice.id,
      purchaseOrderId: context.purchaseOrderId ?? purchaseOrder.id,
      goodsReceiptId: context.goodsReceiptId ?? goodsReceipt?.id,
      vendorName: invoice.vendorName,
    };

    const matchId = await this.persistResult(persistencePayload);

    return {
      matchId,
      result,
    };
  }

  async detectDuplicates(params: {
    workspaceId: string;
    vendorName: string;
    amount: number;
    invoiceNumber?: string;
    invoiceDate?: string;
  }) {
    const candidates = await this.getDuplicateCandidates(
      params.workspaceId,
      params.vendorName,
      params.amount,
      subDays(new Date(), 7).toISOString(),
      new Date().toISOString(),
    );

    if (candidates.length === 0) {
      return { duplicateSuspected: false, candidates: [] as DuplicateCandidate[] };
    }

    const fuse = new Fuse(candidates, {
      keys: ["invoiceNumber", "invoiceDate"],
      threshold: 0.3,
      includeScore: true,
    });

    const matches = fuse.search(params.invoiceNumber ?? "");
    const duplicateSuspected =
      matches.some((match) => (match.score ?? 1) < 0.25) ||
      candidates.some((candidate) => Math.abs(candidate.amount - params.amount) < params.amount * 0.01);

    return {
      duplicateSuspected,
      candidates,
    };
  }

  async pendingApprovals(workspaceId: string) {
    const provider = this.deps.listPendingApprovals ?? listPendingApprovals;
    return provider(workspaceId);
  }

  async submitFeedback(payload: MatchFeedbackPayload) {
    const writer = this.deps.persistMatchFeedback ?? persistMatchFeedback;
    await writer(payload);
  }
}

export const matchingEngine = new MatchingEngine();

