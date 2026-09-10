import "server-only";

import sharp from "sharp";
import type { AllowedImageMime } from "./file-validation";

const MAX_IMAGE_PIXELS = 40_000_000;

/** Re-encoding drops EXIF/IPTC/XMP metadata, including GPS and device fields. */
export async function sanitizeImageForUpload(
  file: File,
  mime: AllowedImageMime,
) {
  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: MAX_IMAGE_PIXELS,
    failOn: "warning",
  }).rotate();

  if (mime === "image/png") {
    return image.png({ compressionLevel: 9 }).toBuffer();
  }
  if (mime === "image/webp") {
    return image.webp({ quality: 90 }).toBuffer();
  }
  return image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
