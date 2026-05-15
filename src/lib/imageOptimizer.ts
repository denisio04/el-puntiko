import sharp from "sharp";

export interface OptimizedImage {
  buffer: Buffer;
  format: "webp";
  width: number;
  height: number;
  size: number;
}

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const WEBP_QUALITY = 80;

export async function optimizeImage(buffer: Buffer): Promise<OptimizedImage> {
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || MAX_WIDTH;
  const originalHeight = metadata.height || MAX_HEIGHT;

  const shouldResize = originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT;

  let pipeline = sharp(buffer);
  if (shouldResize) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true });
  }
  const webpBuffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();

  const webpMetadata = await sharp(webpBuffer).metadata();

  return {
    buffer: webpBuffer,
    format: "webp",
    width: webpMetadata.width || 0,
    height: webpMetadata.height || 0,
    size: webpBuffer.length,
  };
}
