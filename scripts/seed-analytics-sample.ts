#!/usr/bin/env ts-node
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANALYTICS_SEED_USER_ID, ANALYTICS_SEED_EMAIL } =
  process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to seed analytics data.");
}

if (!ANALYTICS_SEED_USER_ID) {
  throw new Error("Set ANALYTICS_SEED_USER_ID to the auth.users UUID you want to seed data for.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PRODUCTS = [
  { name: "AI Compliance Suite", purchase_price: 4800, selling_price: 7200 },
  { name: "GST Filing Retainer", purchase_price: 1500, selling_price: 4200 },
  { name: "WhatsApp Billing Add-on", purchase_price: 600, selling_price: 1750 },
  { name: "Inventory Sync Pro", purchase_price: 2200, selling_price: 3900 },
  { name: "Payments Intelligence", purchase_price: 3200, selling_price: 5200 },
];

async function ensureProfile() {
  const email = ANALYTICS_SEED_EMAIL ?? "analytics-demo@invoicesync.test";

  await supabase
    .from("profiles")
    .upsert(
      [
        {
          id: ANALYTICS_SEED_USER_ID,
          email,
          full_name: "Analytics Demo",
          company: "InvoiceSync Labs",
        },
      ],
      {
        onConflict: "id",
      },
    );
}

async function seedProducts() {
  const existing = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ANALYTICS_SEED_USER_ID);

  if ((existing.count ?? 0) >= PRODUCTS.length) {
    console.log("✅ Products already seeded");
    return;
  }

  const payload = PRODUCTS.map((product, index) => ({
    id: randomUUID(),
    user_id: ANALYTICS_SEED_USER_ID,
    name: product.name,
    stock_qty: 250 - index * 20,
    purchase_price: product.purchase_price,
    selling_price: product.selling_price,
  }));

  await supabase.from("products").upsert(payload);
  console.log(`✅ Inserted ${payload.length} products`);
}

function generateSalesData() {
  const orders: any[] = [];
  const lines: any[] = [];
  const monthsToSeed = 6;

  for (let i = monthsToSeed - 1; i >= 0; i -= 1) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(subMonths(new Date(), i));

    for (let j = 0; j < 4; j += 1) {
      const orderId = randomUUID();
      const customerName = `Demo Customer ${j + 1}`;
      const baseDate = addDays(monthStart, j * 5);
      const transactionDate = baseDate > monthEnd ? monthEnd : baseDate;

      const product = PRODUCTS[(i + j) % PRODUCTS.length];
      const quantity = 3 + ((i + j) % 4);
      const subtotal = quantity * product.selling_price;
      const taxAmount = subtotal * 0.18;
      const grandTotal = subtotal + taxAmount;

      orders.push({
        id: orderId,
        user_id: ANALYTICS_SEED_USER_ID,
        customer_name: customerName,
        invoice_number: `INV-${transactionDate.getFullYear()}${String(transactionDate.getMonth() + 1).padStart(2, "0")}-${j + 100 + i * 10}`,
        transaction_date: transactionDate.toISOString().slice(0, 10),
        total_amount: subtotal,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        payment_status: j % 3 === 0 ? "partial" : "paid",
        amount_paid: j % 3 === 0 ? grandTotal * 0.6 : grandTotal,
      });

      lines.push({
        id: randomUUID(),
        order_id: orderId,
        order_type: "sale",
        product_name: product.name,
        description: `${product.name} subscription`,
        quantity,
        unit_price: product.selling_price,
        tax_rate: 18,
        tax_amount,
        subtotal,
        total_amount: grandTotal,
      });
    }
  }

  return { orders, lines };
}

function generatePurchaseData() {
  const purchaseOrders: any[] = [];

  for (let i = 0; i < 6; i += 1) {
    const monthDate = subMonths(new Date(), i);
    const transactionDate = startOfMonth(monthDate);
    const product = PRODUCTS[i % PRODUCTS.length];
    const qty = 40 + i * 5;
    const subtotal = qty * product.purchase_price;
    const taxAmount = subtotal * 0.12;
    const grandTotal = subtotal + taxAmount;

    purchaseOrders.push({
      id: randomUUID(),
      user_id: ANALYTICS_SEED_USER_ID,
      supplier_name: `${product.name} Supplier`,
      invoice_number: `PO-${transactionDate.getFullYear()}${String(transactionDate.getMonth() + 1).padStart(2, "0")}-${200 + i}`,
      transaction_date: transactionDate.toISOString().slice(0, 10),
      total_amount: subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      payment_status: i % 2 === 0 ? "paid" : "partial",
      amount_paid: i % 2 === 0 ? grandTotal : grandTotal * 0.5,
    });
  }

  return purchaseOrders;
}

async function seedOrders() {
  const { orders, lines } = generateSalesData();
  const purchaseOrders = generatePurchaseData();

  await supabase.from("sales_orders").upsert(orders);
  await supabase.from("order_lines").upsert(lines);
  await supabase.from("purchase_orders").upsert(purchaseOrders);

  console.log(`✅ Seeded ${orders.length} sales orders, ${lines.length} order lines, and ${purchaseOrders.length} purchase orders`);
}

async function run() {
  console.log("🚀 Seeding analytics sample data...");
  await ensureProfile();
  await seedProducts();
  await seedOrders();
  console.log("🎉 Analytics sample data ready!");
}

run().catch((error) => {
  console.error("❌ Failed to seed analytics data", error);
  process.exit(1);
});

