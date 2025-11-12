import sharp from "sharp";

interface OCRVariant {
  label: string;
  buffer: Buffer;
}

const TARGET_DPI = 300;
const MIN_SOURCE_WIDTH = 1;
const MIN_DENSITY = 10;
const MIN_TARGET_WIDTH = 10;

async function upscaleIfNeeded(image: sharp.Sharp, metadata: sharp.Metadata) {
  const density = Math.max(metadata.density ?? MIN_DENSITY, MIN_DENSITY);
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;

  let scale = 1;

  if (density < TARGET_DPI) {
    scale = Math.max(scale, TARGET_DPI / density);
  }

  if (width < MIN_TARGET_WIDTH) {
    scale = Math.max(scale, MIN_TARGET_WIDTH / Math.max(width, 1));
  }

  const resizedWidth = Math.max(Math.round(width * scale), MIN_TARGET_WIDTH);
  const resizedHeight = height > 0 ? Math.round(height * scale) : resizedWidth;

  try {
    return image
      .clone()
      .resize({
        width: resizedWidth,
        height: resizedHeight,
        fit: "fill",
        withoutEnlargement: false,
        kernel: "lanczos3",
      });
  } catch (error) {
    console.warn(`[OCR][Preprocess] Resize failed for ${width}x${height}, forcing minimum size:`, error);
    return image
      .clone()
      .resize({
        width: MIN_TARGET_WIDTH,
        height: MIN_TARGET_WIDTH,
        fit: "fill",
        withoutEnlargement: false,
      });
  }
}

function base(image: sharp.Sharp) {
  return image
    .clone()
    .flatten({ background: "#ffffff" })
    .greyscale()
    .normalise()
    .median(1);
}

export async function generateOCRVariants(buffer: Buffer): Promise<OCRVariant[]> {
  const variants: OCRVariant[] = [];
  const baseImage = sharp(buffer, { failOn: "truncated" });

  const metadata = await baseImage.metadata().catch(() => ({} as sharp.Metadata));

  const prepared = await upscaleIfNeeded(baseImage, metadata);

  const originalPng = await baseImage.clone().png({ compressionLevel: 2 }).toBuffer();
  variants.push({ label: "png_original", buffer: originalPng });

  const normalizedPng = await base(prepared)
    .clone()
    .linear(1.15, -5)
    .gamma()
    .png({ compressionLevel: 2 })
    .toBuffer();
  variants.push({ label: "png_normalized", buffer: normalizedPng });

  const sharpenedPng = await base(prepared)
    .clone()
    .sharpen({ sigma: 1.1, m1: 0.4, m2: 0.6 })
    .png({ compressionLevel: 2 })
    .toBuffer();
  variants.push({ label: "png_sharpened", buffer: sharpenedPng });

  const binaryPng = await base(prepared)
    .clone()
    .threshold(180)
    .png({ compressionLevel: 2 })
    .toBuffer();
  variants.push({ label: "png_binary", buffer: binaryPng });

  return variants;
}


