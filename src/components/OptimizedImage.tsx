"use client";

import Image from "next/image";
import { getImageSizes } from "@/lib/image";

/**
 * Tiny 1×1 blurred placeholder (translucent grey).
 * Keeps the layout stable and shows a shimmer while the real image loads.
 */
const BLUR_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJhAPk3KFyjwAAAABJRU5ErkJggg==";

interface OptimizedImageProps {
  /** The image URL stored in DB (typically the _lg.webp variant, or a legacy URL). */
  src: string;
  alt: string;
  /**
   * Which size variant to prefer.
   * - "thumbnail" → 300 px (_thumb.webp)
   * - "medium"    → 600 px (_md.webp)
   * - "large"     → 1024 px (_lg.webp)
   */
  variant?: "thumbnail" | "medium" | "large";
  /** The `sizes` attribute for responsive loading (e.g. "80px", "(max-width:480px) 100vw, 400px"). */
  sizes: string;
  /** Fill the parent container (position: relative required on parent). */
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  /** Set to true to load eagerly (above-the-fold images). */
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  variant = "large",
  sizes,
  fill,
  width,
  height,
  className,
  priority = false,
}: OptimizedImageProps) {
  if (!src || src === "/placeholder.svg") {
    return null;
  }

  const urls = getImageSizes(src);
  const displayUrl = urls[variant];

  return (
    <Image
      src={displayUrl}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      className={className}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER}
    />
  );
}
