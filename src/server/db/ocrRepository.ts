import { supabaseAdmin } from "./supabaseAdmin.ts";
import type { ExtractionPersistencePayload, OCRRawArtifacts } from "../types.ts";

export async function persistExtractionResult(payload: ExtractionPersistencePayload) {
  const { data, error } = await supabaseAdmin
    .from("invoice_ocr_extractions")
    .insert({
      workspace_id: payload.workspaceId,
      invoice_id: payload.invoiceId ?? null,
      structured_fields: payload.structured,
      raw_artifacts: payload.rawArtifacts,
      overall_confidence: payload.structured.overall_confidence,
      status: payload.status,
      processing_time_ms: payload.processingMs,
      created_by: payload.userId,
      original_filename: payload.originalFilename,
      mime_type: payload.mimeType,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to persist OCR extraction: ${error.message}`);
  }

  return data.id as string;
}

export async function logExtractionAttempt(
  extractionId: string | null,
  workspaceId: string,
  userId: string,
  step: string,
  status: "success" | "failed",
  metadata: Record<string, unknown>,
) {
  try {
    const { error } = await supabaseAdmin.from("invoice_ocr_logs").insert({
      extraction_id: extractionId,
      workspace_id: workspaceId,
      created_by: userId,
      step,
      status,
      metadata,
    });

    if (error) {
      if (error.code === "PGRST205" || error.code === "PGRST116" || error.code === "PGRST121") {
        console.warn("[OCR][Repository] invoice_ocr_logs table missing; skipping log persistence");
        return;
      }
      console.error("[OCR][Repository] Failed to persist log entry", error);
    }
  } catch (error) {
    console.warn("[OCR][Repository] fetch failed while logging OCR attempt", (error as Error).message);
  }
}

export function sanitizeRawArtifacts(artifacts: OCRRawArtifacts) {
  return {
    tesseract: {
      pages: artifacts.tesseract.pages,
      confidence: artifacts.tesseract.confidence,
    },
    claude: artifacts.claude
      ? {
          overall_confidence: artifacts.claude.overall_confidence,
          pages_processed: artifacts.claude.pages_processed,
        }
      : undefined,
  };
}

