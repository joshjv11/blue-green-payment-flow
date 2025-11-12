import { Anthropic } from "@anthropic-ai/sdk";
import { CONFIDENCE_THRESHOLD, env } from "../env.ts";
import type { StructuredInvoiceExtraction } from "../types.ts";
import { structuredInvoiceExtractionSchema } from "./schemas.ts";

const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

function buildPrompt() {
  return `
You are an expert financial data extraction system for business invoices.
Return ONLY a JSON payload that matches this TypeScript type:

{
  "vendor_name": { "value": string | null, "confidence": number, "source": "claude" },
  "vendor_tax_id": { "value": string | null, "confidence": number, "source": "claude" },
  "vendor_email": { "value": string | null, "confidence": number, "source": "claude" },
  "invoice_number": { "value": string | null, "confidence": number, "source": "claude" },
  "invoice_date": { "value": string | null, "confidence": number, "source": "claude" },
  "due_date": { "value": string | null, "confidence": number, "source": "claude" },
  "subtotal": { "value": number | null, "confidence": number, "source": "claude" },
  "tax": { "value": number | null, "confidence": number, "source": "claude" },
  "total_amount": { "value": number | null, "confidence": number, "source": "claude" },
  "payment_terms": { "value": string | null, "confidence": number, "source": "claude" },
  "currency": { "value": string | null, "confidence": number, "source": "claude" },
  "purchase_order_number": { "value": string | null, "confidence": number, "source": "claude" },
  "goods_receipt_number": { "value": string | null, "confidence": number, "source": "claude" },
  "line_items": [{
    "description": { "value": string | null, "confidence": number, "source": "claude" },
    "quantity": { "value": number | null, "confidence": number, "source": "claude" },
    "unit_price": { "value": number | null, "confidence": number, "source": "claude" },
    "total": { "value": number | null, "confidence": number, "source": "claude" }
  }],
  "overall_confidence": number,
  "source_document_type": "pdf" | "image",
  "pages_processed": number
}

Rules:
- Confidence must be between 0 and 1.
- Use ISO 8601 date format YYYY-MM-DD.
- Convert currency amounts to numbers (no currency symbol).
- Set value to null if unsure, with confidence under ${CONFIDENCE_THRESHOLD}.
- Provide at least an empty array for line_items.
- Do not include any additional fields or explanations.
`.trim();
}

export async function runClaudeVisionInference(
  pages: Array<{ buffer: Buffer; pageNumber: number }>,
  sourceDocumentType: "pdf" | "image",
): Promise<StructuredInvoiceExtraction> {
  const prompt = buildPrompt();

  const content = [
    { type: "text" as const, text: prompt },
    ...pages.map((page) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/png",
        data: page.buffer.toString("base64"),
      },
    })),
  ];

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system:
      "You are Claude Vision specialised agent for financial invoice extraction. Only output valid JSON.",
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || !("text" in textBlock)) {
    throw new Error("Claude response did not include a text block");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (error) {
    throw new Error(`Failed to parse Claude JSON response: ${(error as Error).message}`);
  }

  const validated = structuredInvoiceExtractionSchema.parse({
    ...parsed,
    source_document_type: sourceDocumentType,
    pages_processed: pages.length,
  });

  return validated;
}

