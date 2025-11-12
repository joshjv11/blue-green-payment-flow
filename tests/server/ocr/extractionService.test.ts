import { describe, it, expect, beforeEach, vi } from "vitest";
import { OCRExtractionService } from "@/server/ocr/extractionService.ts";
import type {
  ExtractionPersistencePayload,
  StructuredInvoiceExtraction,
} from "@/server/types.ts";

process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-key";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const baseField = <T>(value: T | null, confidence = 0.9, source: "tesseract" | "claude" = "tesseract") => ({
  value,
  confidence,
  source,
  raw: value === null ? null : String(value),
});

const buildStructured = (overrides: Partial<StructuredInvoiceExtraction> = {}) =>
  ({
    vendor_name: baseField("Acme Pvt Ltd"),
    vendor_tax_id: baseField("GSTIN1234XYZ"),
    vendor_email: baseField("billing@acme.com"),
    invoice_number: baseField("INV-1001"),
    invoice_date: baseField("2025-11-01"),
    due_date: baseField("2025-11-15"),
    subtotal: baseField(1000),
    tax: baseField(180),
    total_amount: baseField(1180),
    payment_terms: baseField("Net 14"),
    currency: baseField("INR"),
    purchase_order_number: baseField("PO-77"),
    goods_receipt_number: baseField("GR-55"),
    line_items: [
      {
        description: baseField("Consulting Services"),
        quantity: baseField(10),
        unit_price: baseField(100),
        total: baseField(1000),
      },
    ],
    overall_confidence: 0.9,
    source_document_type: "pdf",
    pages_processed: 1,
    ...overrides,
  }) satisfies StructuredInvoiceExtraction;

describe("OCRExtractionService", () => {
  const persistMock = vi
    .fn<[ExtractionPersistencePayload], Promise<string>>()
    .mockResolvedValue("extraction-id");
  const logMock = vi.fn<
    [string | null, string, string, string, "success" | "failed", Record<string, unknown>],
    Promise<void>
  >().mockResolvedValue(undefined);

  beforeEach(() => {
    persistMock.mockClear();
    logMock.mockClear();
  });

  const jobData = {
    uploadId: "upload-1",
    workspaceId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    invoiceId: "33333333-3333-3333-3333-333333333333",
    originalFilename: "invoice.pdf",
    mimeType: "application/pdf",
    bufferBase64: Buffer.from("dummy").toString("base64"),
    submittedAt: new Date().toISOString(),
  };

  it("returns Tesseract extraction when confidence is above threshold", async () => {
    const service = new OCRExtractionService({
      persist: persistMock,
      log: logMock,
      normalizeInput: vi.fn().mockResolvedValue({
        type: "pdf",
        pages: [{ buffer: Buffer.from("page"), pageNumber: 1, rotation: 0 }],
      }),
      runTesseractPipeline: vi.fn().mockResolvedValue({
        text: "Invoice Number: INV-1001",
        pages: [
          {
            pageNumber: 1,
            rotationApplied: 0,
            variantApplied: "normalized",
            text: "Invoice Number: INV-1001",
            confidence: 0.92,
            words: [],
          },
        ],
        confidence: 0.92,
      }),
      parseTesseractOutput: vi.fn().mockReturnValue(buildStructured()),
    });

    const result = await service.processJob(jobData);

    expect(result.extraction.invoice_number.value).toBe("INV-1001");
    expect(result.extraction.overall_confidence).toBeGreaterThan(0.8);
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalled();
  });

  it("logs low confidence when Tesseract output is weak", async () => {
    const service = new OCRExtractionService({
      persist: persistMock,
      log: logMock,
      normalizeInput: vi.fn().mockResolvedValue({
        type: "pdf",
        pages: [{ buffer: Buffer.from("page"), pageNumber: 1, rotation: 0 }],
      }),
      runTesseractPipeline: vi.fn().mockResolvedValue({
        text: "Unreadable",
        pages: [
          {
            pageNumber: 1,
            rotationApplied: 0,
            variantApplied: "normalized",
            text: "Unreadable",
            confidence: 0.4,
            words: [],
          },
        ],
        confidence: 0.4,
      }),
      parseTesseractOutput: vi.fn().mockReturnValue(
        buildStructured({
          overall_confidence: 0.4,
          vendor_name: baseField(null, 0.4),
        }),
      ),
    });

    const result = await service.processJob(jobData);

    expect(result.extraction.vendor_name.value).toBeNull();
    expect(result.extraction.vendor_name.source).toBe("tesseract");
    expect(result.extraction.overall_confidence).toBeCloseTo(0.4);
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      expect.any(String),
      jobData.workspaceId,
      jobData.userId,
      "tesseract-low-confidence",
      "success",
      expect.objectContaining({ confidence: 0.4 }),
    );
  });

  it("logs and rethrows errors", async () => {
    const service = new OCRExtractionService({
      persist: persistMock,
      log: logMock,
      normalizeInput: vi.fn().mockRejectedValue(new Error("decode failure")),
    });

    await expect(service.processJob(jobData)).rejects.toThrow("decode failure");
    expect(logMock).toHaveBeenLastCalledWith(
      null,
      jobData.workspaceId,
      jobData.userId,
      "extraction-failed",
      "failed",
      expect.objectContaining({ reason: "decode failure" }),
    );
  });
});

