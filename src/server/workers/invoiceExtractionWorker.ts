import { Worker } from "bullmq";
import { redisOptions } from "../redis.ts";
import { invoiceExtractionQueueName } from "../queues/invoiceExtractionQueue.ts";
import type { InvoiceExtractionJobData } from "../types.ts";
import { ocrExtractionService } from "../ocr/extractionService.ts";
import { QUEUE_CONCURRENCY } from "../env.ts";

export const invoiceExtractionWorker = new Worker<InvoiceExtractionJobData>(
  invoiceExtractionQueueName,
  async (job) => {
    const result = await ocrExtractionService.processJob(job.data);
    return result;
  },
  {
    connection: redisOptions,
    concurrency: QUEUE_CONCURRENCY,
  },
);

invoiceExtractionWorker.on("completed", (job) => {
  console.info("[OCR][Worker] Completed job", job.id);
});

invoiceExtractionWorker.on("failed", (job, error) => {
  console.error("[OCR][Worker] Failed job", job?.id, error);
});

