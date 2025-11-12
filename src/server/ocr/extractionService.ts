import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { persistExtractionResult, logExtractionAttempt } from "../db/ocrRepository.ts";
import { CONFIDENCE_THRESHOLD } from "../env.ts";
import type {
  ExtractionPersistencePayload,
  InvoiceExtractionJobData,
  OCRRawArtifacts,
  StructuredInvoiceExtraction,
} from "../types.ts";
import { normalizeInput } from "./pdfUtils.ts";
import { parseTesseractOutput } from "./parser.ts";
import { structuredInvoiceExtractionSchema } from "./schemas.ts";
import { runTesseractPipeline } from "./tesseractClient.ts";

export interface ExtractionServiceDependencies {
  persist?: typeof persistExtractionResult;
  log?: typeof logExtractionAttempt;
  normalizeInput?: typeof normalizeInput;
  runTesseractPipeline?: typeof runTesseractPipeline;
  parseTesseractOutput?: typeof parseTesseractOutput;
}

export class OCRExtractionService {
  constructor(private readonly deps: ExtractionServiceDependencies = {}) {}

  private get persister() {
    return this.deps.persist ?? persistExtractionResult;
  }

  private get logger() {
    return this.deps.log ?? logExtractionAttempt;
  }

  async processJob(job: InvoiceExtractionJobData) {
    const start = performance.now();
    let extractionId: string | null = null;

    try {
      const buffer = Buffer.from(job.bufferBase64, "base64");
      const normalizer = this.deps.normalizeInput ?? normalizeInput;
      const normalized = await normalizer(buffer, job.mimeType);

      await this.logger(null, job.workspaceId, job.userId, "normalize-input", "success", {
        pages_detected: normalized.pages.length,
        document_type: normalized.type,
      });

      const tesseractRunner = this.deps.runTesseractPipeline ?? runTesseractPipeline;
      const tesseractParser = this.deps.parseTesseractOutput ?? parseTesseractOutput;

      const tesseract = await tesseractRunner(normalized.pages);
      const finalStructured = tesseractParser(
        tesseract.text,
        tesseract.pages,
        normalized.type,
      );

      const rawArtifacts: OCRRawArtifacts = {
        tesseract,
      };

      if (finalStructured.overall_confidence < CONFIDENCE_THRESHOLD) {
        await this.logger(
          extractionId,
          job.workspaceId,
          job.userId,
          "tesseract-low-confidence",
          "success",
          {
            confidence: finalStructured.overall_confidence,
            pages: tesseract.pages.length,
          },
        );
      }

      const validated =
        structuredInvoiceExtractionSchema.parse<StructuredInvoiceExtraction>(finalStructured);

      const payload: ExtractionPersistencePayload = {
        workspaceId: job.workspaceId,
        userId: job.userId,
        invoiceId: job.invoiceId,
        originalFilename: job.originalFilename,
        mimeType: job.mimeType,
        structured: validated,
        rawArtifacts,
        processingMs: Math.round(performance.now() - start),
        status: "completed",
      };

      extractionId = await this.persister(payload);

      await this.logger(
        extractionId,
        job.workspaceId,
        job.userId,
        "extraction-complete",
        "success",
        {
          overall_confidence: validated.overall_confidence,
        },
      );

      return {
        extraction: validated,
        jobId: job.jobId ?? crypto.randomUUID(),
        queuedAt: job.submittedAt,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.logger(
        extractionId,
        job.workspaceId,
        job.userId,
        "extraction-failed",
        "failed",
        {
          reason: (error as Error).message,
        },
      );
      throw error;
    }
  }
}

export const ocrExtractionService = new OCRExtractionService();

