"use client";

import { useEffect } from "react";
import { warmWebGL, preloadAboveFold } from "@/lib/arPreloader";

interface Props {
  arModelUrls: string[];
}

/**
 * Mounts on the menu page client-side.
 * 1. Warms the WebGL context immediately (eliminates cold-start delay).
 * 2. Preloads the first 3 above-fold AR models in the background.
 */
export function ARWarmup({ arModelUrls }: Props) {
  useEffect(() => {
    warmWebGL();
    preloadAboveFold(arModelUrls, 5);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
