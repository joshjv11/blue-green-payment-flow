export interface MonetarySummary {
  amount: number;
  currency?: string;
  taxAmount?: number;
  subtotal?: number;
  quantity?: number;
}

export interface InvoicePayload extends MonetarySummary {
  id?: string;
  invoiceNumber?: string;
  vendorName: string;
  vendorTaxId?: string;
  vendorId?: string;
  issueDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  ocrConfidence?: number;
  lineItems?: Array<{
    description?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    ocrConfidence?: number;
  }>;
}

export interface PurchaseOrderPayload extends MonetarySummary {
  id?: string;
  poNumber?: string;
  vendorName: string;
  vendorId?: string;
  issueDate?: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  lineItems?: Array<{
    sku?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface GoodsReceiptPayload {
  id?: string;
  vendorName?: string;
  receiptDate?: string;
  purchaseOrderId?: string;
  lineItems?: Array<{
    sku?: string;
    description?: string;
    quantity: number;
  }>;
}

export type MatchType = "2_way" | "3_way" | "partial" | "unmatched";

export interface MatchingContext {
  workspaceId: string;
  userId: string;
  invoice: InvoicePayload;
  purchaseOrder: PurchaseOrderPayload;
  goodsReceipt?: GoodsReceiptPayload | null;
}

export interface MatchingResult {
  matchType: MatchType;
  confidenceScore: number;
  flaggedReasons: string[];
  requiresApproval: boolean;
  amountVariance: number;
  quantityVariance: number | null;
  paymentTermsVariance: boolean;
  duplicateSuspected: boolean;
  metadata: Record<string, unknown>;
}

export interface DuplicateCandidate {
  invoiceId?: string;
  vendorName: string;
  amount: number;
  invoiceDate?: string;
  invoiceNumber?: string;
}

export interface VendorStats {
  vendorName: string;
  count: number;
  meanAmount: number;
  stdDevAmount: number;
  approvalRate?: number;
}

export interface MatchingPersistencePayload extends MatchingResult {
  workspaceId: string;
  userId: string;
  invoiceId?: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  vendorName: string;
}

export interface MatchFeedbackPayload {
  invoiceMatchId: string;
  workspaceId: string;
  vendorName: string;
  reviewerId: string;
  isCorrect: boolean;
  feedbackNotes?: string;
  approvedAmount?: number;
  approvedQuantity?: number;
}


