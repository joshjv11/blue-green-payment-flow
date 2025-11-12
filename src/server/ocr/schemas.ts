import { z } from "zod";
import type { OCRField, OCRLineItem, StructuredInvoiceExtraction } from "../types.ts";

export const ocrFieldSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    value: inner.nullable(),
    confidence: z.number().min(0).max(1),
    source: z.union([z.literal("tesseract"), z.literal("claude")]),
    raw: z.string().nullable().optional(),
  });

export const numericFieldSchema = ocrFieldSchema(z.number());
export const stringFieldSchema = ocrFieldSchema(z.string());

export const lineItemSchema = z.object({
  description: stringFieldSchema,
  quantity: numericFieldSchema,
  unit_price: numericFieldSchema,
  total: numericFieldSchema,
});

export const structuredInvoiceExtractionSchema = z.object({
  vendor_name: stringFieldSchema,
  vendor_tax_id: stringFieldSchema,
  vendor_email: stringFieldSchema,
  invoice_number: stringFieldSchema,
  invoice_date: stringFieldSchema,
  due_date: stringFieldSchema,
  subtotal: numericFieldSchema,
  tax: numericFieldSchema,
  total_amount: numericFieldSchema,
  payment_terms: stringFieldSchema,
  currency: stringFieldSchema,
  purchase_order_number: stringFieldSchema,
  goods_receipt_number: stringFieldSchema,
  line_items: z.array(lineItemSchema),
  overall_confidence: z.number().min(0).max(1),
  source_document_type: z.union([z.literal("pdf"), z.literal("image")]),
  pages_processed: z.number().int().min(1),
});

export type StructuredInvoiceExtractionInput = z.input<
  typeof structuredInvoiceExtractionSchema
>;

export const invoiceExtractionResponseSchema = z.object({
  extraction: structuredInvoiceExtractionSchema,
  jobId: z.string(),
  queuedAt: z.string(),
  processedAt: z.string(),
});

export type OCRFieldType<T> = OCRField<T>;
export type OCRLineItemType = OCRLineItem;
export type StructuredInvoiceExtractionType = StructuredInvoiceExtraction;

