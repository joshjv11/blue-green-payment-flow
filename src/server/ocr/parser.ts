import { parse } from "date-fns";
import { CONFIDENCE_THRESHOLD } from "../env.ts";
import type { OCRField, OCRLineItem, StructuredInvoiceExtraction } from "../types.ts";
import type { TesseractPageResult } from "./tesseractClient.ts";

function createField<T>(
  value: T | null,
  confidence: number,
  raw: string | null,
  source: "tesseract" | "claude" = "tesseract",
): OCRField<T> {
  return {
    value,
    confidence: Math.max(0, Math.min(1, confidence)),
    source,
    raw,
  };
}

function pickFirstMatch(regexes: RegExp[], text: string) {
  for (const regex of regexes) {
    const match = regex.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function parseCurrency(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/[^0-9.,-]/g, "");
  const commaCount = (normalized.match(/,/g) || []).length;

  let sanitized = normalized;
  if (commaCount > 1 && !normalized.includes(".")) {
    sanitized = normalized.replace(/,/g, "");
  } else if (commaCount === 1 && normalized.indexOf(",") > normalized.indexOf(".")) {
    sanitized = normalized.replace(/,/g, "");
  } else {
    sanitized = normalized.replace(/,/g, "");
  }

  const parsed = Number.parseFloat(sanitized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy", "MM-dd-yyyy"];

  for (const format of formats) {
    try {
      const parsed = parse(value, format, new Date());
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    } catch {
      // noop
    }
  }

  const isoLike = value.match(
    /\b(20\d{2}|19\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/,
  );
  if (isoLike?.[0]) {
    return isoLike[0].replaceAll("/", "-");
  }

  return null;
}

function parseLineItems(text: string, baseConfidence: number): OCRLineItem[] {
  const lines = text.split("\n").map((line) => line.trim());
  const itemLines = lines.filter(
    (line) =>
      /\d/.test(line) && (line.includes("x") || line.match(/\d+\s+[A-Za-z]/) || line.includes("$")),
  );

  return itemLines.slice(0, 20).map((line) => {
    const quantityMatch = line.match(/(\d+(\.\d+)?)(?=\s*(x|qty|pcs|\*))/i);
    const unitPriceMatch = line.match(/(?:x|@|\bqty\b.*)(\d+[\d,.\s]+)/i);
    const totalMatch = line.match(/(\d+[\d,.,]+)/g);

    const totals = totalMatch ? totalMatch.map(parseCurrency).filter((v) => v !== null) : [];
    const total = totals.length ? totals[totals.length - 1] : null;
    const unitPrice = unitPriceMatch ? parseCurrency(unitPriceMatch[1]) : null;
    const quantity = quantityMatch ? Number.parseFloat(quantityMatch[1]) : null;

    return {
      description: createField(
        line.replace(/[0-9.,₹$€£]+/g, "").trim() || line,
        baseConfidence * 0.7,
        line,
      ),
      quantity: createField(quantity, baseConfidence * 0.6, quantityMatch?.[0] ?? null),
      unit_price: createField(unitPrice, baseConfidence * 0.6, unitPriceMatch?.[0] ?? null),
      total: createField(total, baseConfidence * 0.7, totals.length ? totals.join(" ") : null),
    };
  });
}

function detectCurrencySymbol(text: string) {
  if (text.includes("₹")) return "INR";
  if (text.includes("$")) return "USD";
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  const codeMatch = text.match(/\b(USD|EUR|GBP|INR|AUD|CAD|SGD|MYR)\b/);
  return codeMatch?.[1] ?? null;
}

export function parseTesseractOutput(
  text: string,
  pages: TesseractPageResult[],
  sourceDocumentType: "pdf" | "image",
): StructuredInvoiceExtraction {
  const baseConfidence =
    pages.reduce((acc, value) => acc + value.confidence, 0) / pages.length || 0.5;

  const vendorName = pickFirstMatch(
    [
      /Vendor\s*:\s*(.*)/i,
      /Supplier\s*:\s*(.*)/i,
      /From\s*:\s*(.*)/i,
      /^([A-Za-z\s&.]+)\nInvoice/i,
    ],
    text,
  );

  const vendorTaxId = pickFirstMatch(
    [
      /(GSTIN|VAT|Tax\s*ID|TIN)\s*[:#]?\s*([A-Z0-9-]+)/i,
      /(PAN)\s*[:#]?\s*([A-Z0-9-]+)/i,
    ],
    text,
  );

  const vendorEmail = pickFirstMatch([/([\w.-]+@[\w.-]+\.[A-Za-z]{2,})/], text);

  const invoiceNumber = pickFirstMatch(
    [/Invoice\s*(No|#)\s*[:#]?\s*([A-Za-z0-9-]+)/i, /Bill\s*(No|#)\s*[:#]?\s*([A-Za-z0-9-]+)/i],
    text,
  );

  const invoiceDateRaw = pickFirstMatch(
    [/Invoice\s*Date\s*[:#]?\s*(.*)/i, /Date\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/],
    text,
  );

  const dueDateRaw = pickFirstMatch(
    [/Due\s*Date\s*[:#]?\s*(.*)/i, /Payment\s*Due\s*[:#]?\s*(.*)/i],
    text,
  );

  const subtotalRaw = pickFirstMatch(
    [/Subtotal\s*[:#]?\s*([A-Za-z]{0,3}\s*[\d,.\s]+)/i, /Sub\s*Total\s*[:#]?\s*([\d,.,\s]+)/i],
    text,
  );

  const taxRaw = pickFirstMatch(
    [/Tax\s*(Amount)?\s*[:#]?\s*([A-Za-z]{0,3}\s*[\d,.\s]+)/i, /(GST|VAT)\s*[:#]?\s*([\d,.\s]+)/i],
    text,
  );

  const totalRaw = pickFirstMatch(
    [
      /Total\s*Amount\s*[:#]?\s*([A-Za-z]{0,3}\s*[\d,.\s]+)/i,
      /Grand\s*Total\s*[:#]?\s*([A-Za-z]{0,3}\s*[\d,.\s]+)/i,
      /Amount\s*Due\s*[:#]?\s*([A-Za-z]{0,3}\s*[\d,.\s]+)/i,
    ],
    text,
  );

  const poNumber = pickFirstMatch(
    [/PO\s*(No|#)\s*[:#]?\s*([A-Za-z0-9-]+)/i, /Purchase\s*Order\s*(No|#)\s*[:#]?\s*([A-Za-z0-9-]+)/i],
    text,
  );

  const grNumber = pickFirstMatch(
    [/GRN\s*(No|#)\s*[:#]?\s*([A-Za-z0-9-]+)/i, /Goods\s*Receipt\s*[:#]?\s*([A-Za-z0-9-]+)/i],
    text,
  );

  const paymentTerms = pickFirstMatch(
    [/Payment\s*Terms\s*[:#]?\s*([A-Za-z0-9\s-]+)/i, /(Net\s*\d+\s*Days)/i],
    text,
  );

  const currency = detectCurrencySymbol(text);

  return {
    vendor_name: createField(vendorName, baseConfidence, vendorName),
    vendor_tax_id: createField(vendorTaxId, baseConfidence, vendorTaxId),
    vendor_email: createField(vendorEmail, baseConfidence, vendorEmail),
    invoice_number: createField(invoiceNumber, baseConfidence, invoiceNumber),
    invoice_date: createField(parseDate(invoiceDateRaw), baseConfidence, invoiceDateRaw),
    due_date: createField(parseDate(dueDateRaw), baseConfidence * 0.9, dueDateRaw),
    subtotal: createField(parseCurrency(subtotalRaw), baseConfidence * 0.7, subtotalRaw),
    tax: createField(parseCurrency(taxRaw), baseConfidence * 0.7, taxRaw),
    total_amount: createField(parseCurrency(totalRaw), baseConfidence, totalRaw),
    payment_terms: createField(paymentTerms, baseConfidence * 0.8, paymentTerms),
    currency: createField(currency, baseConfidence * 0.6, currency),
    purchase_order_number: createField(poNumber, baseConfidence * 0.7, poNumber),
    goods_receipt_number: createField(grNumber, baseConfidence * 0.6, grNumber),
    line_items: parseLineItems(text, baseConfidence),
    overall_confidence: baseConfidence,
    source_document_type: sourceDocumentType,
    pages_processed: pages.length,
  };
}

export function mergeResults(
  primary: StructuredInvoiceExtraction,
  fallback: StructuredInvoiceExtraction,
) {
  const merged: StructuredInvoiceExtraction = {
    ...primary,
    overall_confidence: Math.max(primary.overall_confidence, fallback.overall_confidence),
    line_items:
      primary.line_items.length > 0 ? primary.line_items : fallback.line_items ?? [],
  };

  const keys = [
    "vendor_name",
    "vendor_tax_id",
    "vendor_email",
    "invoice_number",
    "invoice_date",
    "due_date",
    "subtotal",
    "tax",
    "total_amount",
    "payment_terms",
    "currency",
    "purchase_order_number",
    "goods_receipt_number",
  ] as const;

  for (const key of keys) {
    const field = primary[key];
    if (
      !field.value ||
      field.confidence < CONFIDENCE_THRESHOLD ||
      field.value === "" ||
      (typeof field.value === "number" && Number.isNaN(field.value))
    ) {
      merged[key] = fallback[key];
    }
  }

  return merged;
}

