import { Queue, QueueEvents } from "bullmq";
import crypto from "node:crypto";
import { redisOptions } from "../redis.ts";
import type { InvoiceExtractionJobData } from "../types.ts";

export const invoiceExtractionQueueName = "invoice-ocr-extract";

export const invoiceExtractionQueue = new Queue<InvoiceExtractionJobData>(
  invoiceExtractionQueueName,
  {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      timeout: 90_000,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  },
);

export const invoiceExtractionQueueEvents = new QueueEvents(
  invoiceExtractionQueueName,
  {
    connection: redisOptions,
  },
);

invoiceExtractionQueueEvents.on("error", (error) => {
  console.error("[OCR][QueueEvents] error", error);
});

void invoiceExtractionQueueEvents.waitUntilReady();

export async function enqueueInvoiceExtraction(
  data: Omit<InvoiceExtractionJobData, "jobId">,
) {
  const jobId = data.uploadId ?? crypto.randomUUID();
  return invoiceExtractionQueue.add(jobId, { ...data, jobId });
}

