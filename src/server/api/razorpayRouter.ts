import express from "express";
import Razorpay from "razorpay";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const razorpayRouter = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_RrTZxtIPgH7zsH",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "3f5hjEeCf6Mz7ZZM47lLuS0F",
});

razorpayRouter.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "razorpay" });
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Supabase credentials missing for Razorpay verification");
}

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

/* 
  Verify Payment Endpoint
*/
razorpayRouter.post("/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        // Verify Signature
        const key_secret = process.env.RAZORPAY_KEY_SECRET || "3f5hjEeCf6Mz7ZZM47lLuS0F";
        const generated_signature = crypto
            .createHmac("sha256", key_secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            res.status(400).json({ error: "Invalid signature" });
            return;
        }

        // Update Plan in Database using RPC to avoid Schema Cache issues
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        const { error } = await supabase.rpc('verify_and_upgrade_plan', {
            _user_id: userId,
            _plan_id: planId || 'pro',
            _valid_until: validUntil.toISOString()
        });

        if (error) {
            console.error("Supabase Plan Update Error:", error);
            throw new Error(error.message);
        }

        res.json({ success: true, message: "Payment verified and plan updated" });

    } catch (error: any) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

// Schema for creating a payment order
const createOrderSchema = z.object({
    amount: z.number().int().positive(),
    currency: z.enum(["INR"]).optional().default("INR"),
    receipt: z.string().optional(),
    notes: z.record(z.string()).optional(),
});

razorpayRouter.post("/create-order", async (req, res) => {
    try {
        const { amount, currency, receipt, notes } = createOrderSchema.parse(req.body);

        // Razorpay receipt max length is 40 characters.
        const safeReceipt = receipt ? receipt.slice(0, 40) : undefined;

        const options = {
            amount,
            currency,
            receipt: safeReceipt,
            notes,
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order,
        });
    } catch (error: any) {
        console.error("Razorpay Order Error:", error);

        // Handle Razorpay specific errors
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
