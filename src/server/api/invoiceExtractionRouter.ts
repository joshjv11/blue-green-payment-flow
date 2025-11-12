import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { enqueueInvoiceExtraction } from "../queues/invoiceExtractionQueue.ts";
import type { InvoiceExtractionJobData } from "../types.ts";
import "../workers/invoiceExtractionWorker.ts";
import { ocrExtractionService } from "../ocr/extractionService.ts";
import { SYNC_TIMEOUT_MS } from "../env.ts";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  sync: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

class ExtractionTimeoutError extends Error {
  constructor(message = "Tesseract processing timed out") {
    super(message);
    this.name = "ExtractionTimeoutError";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new ExtractionTimeoutError()), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

export const invoiceExtractionRouter = express.Router();

invoiceExtractionRouter.post(
  "/extract-from-upload",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "file field is required" });
      }

      const parsed = requestSchema.parse({
        workspaceId: req.body.workspaceId,
        userId: req.body.userId,
        invoiceId: req.body.invoiceId,
        sync: req.body.sync,
      });

      const jobData: InvoiceExtractionJobData = {
        uploadId: req.body.uploadId ?? crypto.randomUUID(),
        workspaceId: parsed.workspaceId,
        userId: parsed.userId,
        invoiceId: parsed.invoiceId,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        bufferBase64: req.file.buffer.toString("base64"),
        submittedAt: new Date().toISOString(),
      };

      const shouldQueueOnly = parsed.sync === false;

      if (shouldQueueOnly) {
        const job = await enqueueInvoiceExtraction(jobData);
        return res.status(202).json({
          success: false,
          jobId: job.id,
          status: "queued",
          queuedAt: jobData.submittedAt,
          hint: "Processing queued as requested.",
        });
      }

      try {
        const inlineResult = await withTimeout(
          ocrExtractionService.processJob(jobData),
          SYNC_TIMEOUT_MS,
        );

        return res.status(200).json({
          success: true,
          ...inlineResult,
        });
      } catch (error) {
        if (error instanceof ExtractionTimeoutError) {
          return res.status(504).json({
            success: false,
            error: "OCR processing exceeded the inline timeout. Please retry with a clearer scan.",
          });
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      console.error("[OCR][API] inline processing failed", error);
      return next(error);
    }
  },
);

