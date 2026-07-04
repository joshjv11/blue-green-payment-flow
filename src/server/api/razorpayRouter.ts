import express from "express";
import Razorpay from "razorpay";
import { z } from "zod";
import crypto from "crypto";

export const razorpayRouter = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_RrTZxtIPgH7zsH",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "3f5hjEeCf6Mz7ZZM47lLuS0F",
});

razorpayRouter.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "razorpay" });
});

razorpayRouter.post("/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const key_secret = process.env.RAZORPAY_KEY_SECRET || "3f5hjEeCf6Mz7ZZM47lLuS0F";
        const generated_signature = crypto
            .createHmac("sha256", key_secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            res.status(400).json({ error: "Invalid signature" });
            return;
        }

        console.warn("Plan upgrade after payment not migrated — signature verified only");
        res.json({ success: true, message: "Payment verified (plan upgrade pending migration)" });

    } catch (error: any) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

const createOrderSchema = z.object({
    amount: z.number().int().positive(),
    currency: z.enum(["INR"]).optional().default("INR"),
    receipt: z.string().optional(),
    notes: z.record(z.string()).optional(),
});

razorpayRouter.post("/create-order", async (req, res) => {
    try {
        const { amount, currency, receipt, notes } = createOrderSchema.parse(req.body);
        const safeReceipt = receipt ? receipt.slice(0, 40) : undefined;

        const order = await razorpay.orders.create({
            amount,
            currency,
            receipt: safeReceipt,
            notes,
        });

        res.json({ success: true, order });
    } catch (error: any) {
        console.error("Razorpay Order Error:", error);

        if (error.statusCode) {
            res.status(error.statusCode).json({
                success: false,
                error: error.error?.description || error.message || "Razorpay API Error",
                details: error.error
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: error.message || "Failed to create order",
        });
    }
});
