export type OCRSource = "tesseract" | "claude";

export interface OCRField<T> {
  value: T | null;
  confidence: number;
  source: OCRSource;
  raw?: string | null;
}

export interface OCRLineItem {
  description: OCRField<string>;
  quantity: OCRField<number>;
  unit_price: OCRField<number>;
  total: OCRField<number>;
}

export interface StructuredInvoiceExtraction {
  vendor_name: OCRField<string>;
  vendor_tax_id: OCRField<string>;
  vendor_email: OCRField<string>;
  invoice_number: OCRField<string>;
  invoice_date: OCRField<string>;
  due_date: OCRField<string>;
  subtotal: OCRField<number>;
  tax: OCRField<number>;
  total_amount: OCRField<number>;
  payment_terms: OCRField<string>;
  currency: OCRField<string>;
  purchase_order_number: OCRField<string>;
  goods_receipt_number: OCRField<string>;
  line_items: OCRLineItem[];
  overall_confidence: number;
  source_document_type: "pdf" | "image";
  pages_processed: number;
}

export interface OCRRawArtifacts {
  tesseract: Record<string, unknown>;
  claude?: Record<string, unknown>;
}

export interface InvoiceExtractionJobData {
  jobId?: string;
  uploadId: string;
  workspaceId: string;
  userId: string;
  invoiceId?: string;
  originalFilename: string;
  mimeType: string;
  bufferBase64: string;
  submittedAt: string;
}

export interface ExtractionPersistencePayload {
  workspaceId: string;
  userId: string;
  invoiceId?: string;
  originalFilename: string;
  mimeType: string;
  structured: StructuredInvoiceExtraction;
  rawArtifacts: OCRRawArtifacts;
  processingMs: number;
  status: "completed" | "failed";
  failureReason?: string;
}

