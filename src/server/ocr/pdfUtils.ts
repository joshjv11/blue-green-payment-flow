import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, Image, type SKRSContext2D } from "@napi-rs/canvas";
import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api.js";
import sharp from "sharp";
import { MAX_PAGES } from "../env.ts";

// Suppress pdfjs console warnings for missing fonts (they're non-critical)
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = String(args[0] ?? "");
  if (
    message.includes("standardFontDataUrl") ||
    message.includes("getPathGenerator") ||
    message.includes("Requesting object that isn't resolved")
  ) {
    return; // Suppress font-related warnings
  }
  originalWarn(...args);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerCandidates = [
  "../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.js",
];

for (const candidate of workerCandidates) {
  const resolved = path.resolve(__dirname, candidate);
  if (fs.existsSync(resolved)) {
    GlobalWorkerOptions.workerSrc = resolved;
    break;
  }
}

export interface PageImage {
  buffer: Buffer;
  pageNumber: number;
  rotation: number;
}

export interface NormalizedInput {
  type: "pdf" | "image";
  pages: PageImage[];
}

async function renderPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  rotation: number,
) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({
    scale: 2,
    rotation,
  });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d") as SKRSContext2D | null;
  if (!context) {
    throw new Error("Failed to obtain 2D canvas context");
  }
  // pdf.js expects Image to be present on global scope
  // @ts-expect-error - assign for pdfjs rendering
  global.Image = Image;
  const renderContext: Parameters<typeof page.render>[0] = {
    canvasContext: context,
    viewport,
  };

  await page.render(renderContext).promise;

  return canvas.toBuffer("image/png");
}

export async function normalizeInput(
  buffer: Buffer,
  mimeType: string,
): Promise<NormalizedInput> {
  if (mimeType === "application/pdf" || buffer.subarray(0, 4).toString() === "%PDF") {
    const pdfBuffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    const totalPages = Math.min(pdf.numPages, MAX_PAGES);
    const pages: PageImage[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const pngBuffer = await renderPdfPage(pdf, pageNumber, 0);
      pages.push({
        buffer: pngBuffer,
        pageNumber,
        rotation: 0,
      });
    }

    return {
      type: "pdf",
      pages,
    };
  }

  // treat any other input as image
  const normalized = await sharp(buffer).ensureAlpha().toFormat("png").toBuffer();

  return {
    type: "image",
    pages: [
      {
        buffer: normalized,
        pageNumber: 1,
        rotation: 0,
      },
    ],
  };
}

