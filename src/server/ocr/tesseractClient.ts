import Tesseract from "tesseract.js";
import sharp from "sharp";
import { DEFAULT_LANGUAGE } from "../env.ts";
import { generateOCRVariants } from "./preprocess.ts";

const ROTATIONS = [0, 90, 180, 270] as const;

export interface TesseractPageResult {
  pageNumber: number;
  rotationApplied: number;
  variantApplied: string;
  text: string;
  confidence: number;
  words: Array<{ text: string; confidence: number }>;
}

async function recogniseBuffer(buffer: Buffer, lang: string) {
  try {
    const result = await Tesseract.recognize(buffer, lang, {
      logger: () => undefined,
    });

    const text = result?.data?.text ?? "";
    const confidence = result?.data?.confidence ?? 0;
    const words = Array.isArray(result?.data?.words) ? result.data.words : [];

    return {
      text,
      confidence,
      words: words.map((word) => ({
        text: word.text ?? "",
        confidence: word.confidence ?? 0,
      })),
    };
  } catch (error) {
    const message = (error as Error)?.message ?? "Unknown tesseract error";
    // libtiff failures often mention pixReadFromTiffStream
    const isRecoverable =
      message.includes("pixReadFromTiffStream") ||
      message.includes("Error attempting to read image") ||
      message.includes("Read Error at byte") ||
      message.includes("Error in pixRead");

    console.warn("[OCR][Tesseract] recogniseBuffer failed", message);

    if (!isRecoverable) {
      throw error;
    }

    return {
      text: "",
      confidence: 0,
      words: [],
    };
  }
}

export async function runTesseractOnPage(
  buffer: Buffer,
  pageNumber: number,
  lang = DEFAULT_LANGUAGE,
): Promise<TesseractPageResult> {
  let bestResult: TesseractPageResult | null = null;
  const variants = await generateOCRVariants(buffer);

  if (variants.length === 0) {
    variants.push({
      label: "original",
      buffer: await sharp(buffer)
        .flatten({ background: "#ffffff" })
        .toFormat("tiff", { compression: "lzw" })
        .toBuffer(),
    });
  }

  for (const variant of variants) {
    for (const rotation of ROTATIONS) {
      const rotatedBuffer =
        rotation === 0
          ? variant.buffer
          : await sharp(variant.buffer).rotate(rotation).toBuffer();
      const result = await recogniseBuffer(rotatedBuffer, lang);

      if (!bestResult || result.confidence > bestResult.confidence) {
        bestResult = {
          pageNumber,
          rotationApplied: rotation,
          variantApplied: variant.label,
          text: result.text,
          confidence: result.confidence / 100,
          words: result.words.map((word) => ({
            text: word.text,
            confidence: word.confidence / 100,
          })),
        };
      }
    }
  }

  // Fallback in case no result was produced (should not happen)
  if (!bestResult) {
    return {
      pageNumber,
      rotationApplied: 0,
      variantApplied: "unavailable",
      text: "",
      confidence: 0,
      words: [],
    };
  }

  return bestResult;
}

export async function runTesseractPipeline(
  pages: Array<{ buffer: Buffer; pageNumber: number }>,
  lang = DEFAULT_LANGUAGE,
) {
  const results: TesseractPageResult[] = [];

  for (const page of pages) {
    const result = await runTesseractOnPage(page.buffer, page.pageNumber, lang);
    results.push(result);
  }

  const fullText = results.map((page) => page.text).join("\n\n");
  const avgConfidence =
    results.reduce((acc, page) => acc + page.confidence, 0) / results.length || 0;

  return {
    pages: results,
    text: fullText,
    confidence: avgConfidence,
  };
}

