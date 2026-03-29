/**
 * Client-side image compression + URL helpers for the image optimization pipeline.
 *
 * Flow: compress in browser → upload to /api/upload → sharp generates 3 WebP sizes.
 */
import imageCompression from "browser-image-compression";

/** Maximum dimensions/quality for the client-side pre-compression step. */
const COMPRESS_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.8,
};

/**
 * Compress an image file client-side before uploading.
 * Shrinks 20MB+ originals to roughly ≤1 MB WebP.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression for files already small enough
  if (file.size <= 500_000) return file;
  return imageCompression(file, COMPRESS_OPTIONS);
}

/* ── URL convention helpers ──
 *
 * Optimized images are stored with suffixes:
 *   {base}_thumb.webp   (300 px)
 *   {base}_md.webp      (600 px)
 *   {base}_lg.webp      (1024 px)
 *
 * The DB stores the `_lg.webp` URL in `image_url`.
 */

/** Strip any cache-bust query param. */
function stripQuery(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

/** Check whether a URL follows the optimized naming convention. */
export function isOptimizedUrl(url: string): boolean {
  const clean = stripQuery(url);
  return clean.endsWith("_lg.webp") || clean.endsWith("_md.webp") || clean.endsWith("_thumb.webp");
}

/** Derive the base path from any of the three size URLs. */
function toBase(url: string): string {
  const clean = stripQuery(url);
  return clean.replace(/_(?:thumb|md|lg)\.webp$/, "");
}

export interface ImageSizes {
  thumbnail: string; // 300px
  medium: string;    // 600px
  large: string;     // 1024px
}

/**
 * Given any optimized image URL (or the stored `_lg.webp` URL),
 * return all three size variants.
 *
 * If the URL is NOT an optimized one (legacy upload), returns the original
 * URL for all three sizes so existing images keep working.
 */
export function getImageSizes(url: string): ImageSizes {
  if (!isOptimizedUrl(url)) {
    return { thumbnail: url, medium: url, large: url };
  }
  const base = toBase(url);
  return {
    thumbnail: `${base}_thumb.webp`,
    medium: `${base}_md.webp`,
    large: `${base}_lg.webp`,
  };
}
