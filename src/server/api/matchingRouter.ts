import express from "express";
import { z } from "zod";
import { matchingEngine } from "../matching/matchingEngine.ts";
import type { GoodsReceiptPayload, InvoicePayload, PurchaseOrderPayload } from "../matching/types.ts";

const invoiceSchema = z.object({
  id: z.string().uuid().optional(),
  invoiceNumber: z.string().optional(),
  vendorName: z.string().min(1),
  vendorTaxId: z.string().optional(),
  vendorId: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().optional(),
  taxAmount: z.number().optional(),
  subtotal: z.number().optional(),
  quantity: z.number().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  ocrConfidence: z.number().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().optional(),
        quantity: z.number().optional(),
        unitPrice: z.number().optional(),
        total: z.number().optional(),
        ocrConfidence: z.number().optional(),
      }),
    )
    .optional(),
});

const purchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  poNumber: z.string().optional(),
  vendorName: z.string().min(1),
  vendorId: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().optional(),
  taxAmount: z.number().optional(),
  subtotal: z.number().optional(),
  quantity: z.number().optional(),
  issueDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        sku: z.string().optional(),
        description: z.string().optional(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      }),
    )
    .optional(),
});

const goodsReceiptSchema = z
  .object({
    id: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    vendorName: z.string().optional(),
    receiptDate: z.string().optional(),
    lineItems: z
      .array(
        z.object({
          sku: z.string().optional(),
          description: z.string().optional(),
          quantity: z.number(),
        }),
      )
      .optional(),
  })
  .optional();

const matchRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  goodsReceiptId: z.string().uuid().optional(),
  invoice: invoiceSchema,
  purchaseOrder: purchaseOrderSchema,
  goodsReceipt: goodsReceiptSchema.optional(),
});

const feedbackSchema = z.object({
  workspaceId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  invoiceMatchId: z.string().uuid(),
  vendorName: z.string(),
  isCorrect: z.boolean(),
  feedbackNotes: z.string().optional(),
  approvedAmount: z.number().optional(),
  approvedQuantity: z.number().optional(),
});

export const matchingRouter = express.Router();

matchingRouter.post("/create-3way-match", async (req, res, next) => {
  try {
    const payload = matchRequestSchema.parse(req.body);

    const response = await matchingEngine.match({
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      invoiceId: payload.invoiceId,
      purchaseOrderId: payload.purchaseOrderId,
      goodsReceiptId: payload.goodsReceiptId,
      invoice: payload.invoice as InvoicePayload,
      purchaseOrder: payload.purchaseOrder as PurchaseOrderPayload,
      goodsReceipt: (payload.goodsReceipt ?? undefined) as GoodsReceiptPayload | undefined,
    });

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    return next(error);
  }
});

matchingRouter.get("/pending-approval", async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const result = await matchingEngine.pendingApprovals(workspaceId);
    res.json({ matches: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    return next(error);
  }
});

matchingRouter.post("/approve-with-feedback", async (req, res, next) => {
  try {
    const payload = feedbackSchema.parse(req.body);
    await matchingEngine.submitFeedback(payload);
    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    return next(error);
  }
});

