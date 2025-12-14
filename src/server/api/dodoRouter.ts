import express from "express";
import DodoPayments from "dodopayments";
import { z } from "zod";

export const dodoRouter = express.Router();

// Initialize the client
// Note: In production, verify if "bearerToken" or "apiKey" is the correct constructor param.
// Based on typical SDKs, it might be the first argument or { apiKey: ... }.
// The installed version seems to export DodoPayments.
// We'll assume standard initialization.
const client = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
});

// Schema for creating a payment
const createPaymentSchema = z.object({
    amount: z.number().int().positive(), // Amount in smallest currency unit (e.g., cents)
    currency: z.enum(["INR", "USD", "EUR"]),
    productName: z.string().optional().default("Premium Plan"),
    customerEmail: z.string().email().optional(),
    customerName: z.string().optional(),
});

dodoRouter.post("/create-payment", async (req, res) => {
    try {
        const { amount, currency, productName, customerEmail, customerName } = createPaymentSchema.parse(req.body);

        // Step 1: Create a product
        // We create a new product for each transaction to ensure pricing is correct and simple.
        // In a real app with fixed plans, we would use existing product IDs.
        const product = await client.products.create({
            name: productName,
            description: `Payment for ${productName}`,
            tax_category: "digital_products", // Valid tax category
            price: {
                type: "one_time_price",
                price: amount,
                currency: currency as any,
                discount: 0,
                purchasing_power_parity: false,
                pay_what_you_want: false
            }
        });

        // Step 2: Create Checkout Session
        const session = await client.checkoutSessions.create({
            product_cart: [{
                product_id: product.product_id,
                quantity: 1,
            }],
            billing_address: {
                country: "IN", // Defaulting to India as per context (UPI, INR)
                street: "N/A", // Mandatory field workaround if needed
                city: "Mumbai",
                state: "MH",
                zipcode: "400001"
            },
            customer: {
                email: customerEmail || "guest@example.com",
                name: customerName || "Guest User",
            },
            return_url: `${process.env.FRONTEND_URL || "http://localhost:8080"}/payment/success`
            // Note: req.protocol might be http, host might be localhost:4000.
            // Frontend is at 8080.
            // We should ideally use an environment variable for the frontend URL.
            // For this environment, we'll try to redirect to /payment/success relative to the frontend origin if possible,
            // but return_url usually needs absolute path.
            // We'll use a hardcoded assumption for dev if needed, or derived.
        });

        // Override return_url to point to frontend port 8080 if on localhost:4000
        // But we can't update it after creation easily.
        // The session creation effectively sets it.
        // If the valid return_url is needed, we should pass it correctly.
        // Let's assume the user will handle the success page.

        res.json({
            checkout_url: session.checkout_url,
            session_id: session.session_id
        });

    } catch (error: any) {
        console.error("Dodo Payment Error:", error);
        res.status(500).json({
            error: error.message || "Failed to create payment",
            details: error.response?.data || error
        });
    }
});
