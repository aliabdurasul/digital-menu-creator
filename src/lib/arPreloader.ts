/**
 * arPreloader — client-side singleton that network-prefetches GLB models
 * into the HTTP cache so the browser can serve them instantly when
 * model-viewer requests them. Uses fetch() only — no hidden model-viewer
 * elements, no double GPU-decode.
 *
 * Usage:
 *   preloadModel(url)    — cache-warm a GLB file (skips files > 20 MB)
 *   markReady(url)       — called by ARViewer after its own load event
 *   isModelReady(url)    — true only after markReady() has been called
 *   getLoadState(url)    — "idle" | "prefetching" | "ready" | "error"
 *   warmWebGL()          — mount a 1px model-viewer to init WebGL early
 *   preloadAboveFold(urls, limit) — network-prefetch first N models
 */

export type LoadState = "idle" | "prefetching" | "ready" | "error" | "skipped";

// ── Singletons (persist for the entire browser session) ───────────────────
const stateMap = new Map<string, LoadState>();

// Skip fetch for models larger than this — saves bandwidth and avoids
// monopolising the HTTP cache for very large files.
const SIZE_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB

// ── URL normalization — strip query params so ?t=cache-buster doesn't
// create duplicate keys for the same physical file.
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

// ── Internal async fetch ──────────────────────────────────────────────────
async function doPrefetch(url: string): Promise<void> {
  const key = normalizeUrl(url);
  try {
    // HEAD first — cheap size check before committing to a full download
    const head = await fetch(url, { method: "HEAD" });
    const length = parseInt(head.headers.get("content-length") ?? "0", 10);
    if (length > SIZE_THRESHOLD_BYTES) {
      // Too large to prefetch — mark skipped so we never retry the HEAD
      stateMap.set(key, "skipped");
      return;
    }
    // Full GET into browser HTTP cache
    await fetch(url, { cache: "force-cache" });
    // State stays "prefetching" until ARViewer calls markReady().
    // isModelReady() returns false until the visible model-viewer fires load.
  } catch {
    stateMap.set(key, "error");
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Warm the HTTP cache for a GLB file. Fire-and-forget (returns void).
 * Skips files over 20 MB and de-duplicates in-flight requests.
 * Normalizes URL (strips query params) before keying.
 */
export function preloadModel(url: string): void {
  if (typeof window === "undefined") return;
  const key = normalizeUrl(url);
  const current = stateMap.get(key);
  if (current === "ready" || current === "prefetching" || current === "skipped") return;
  stateMap.set(key, "prefetching");
  doPrefetch(url);
}

/**
 * Called by ARViewer after its own model-viewer fires the "load" event.
 * This is the only place that promotes a URL's state to "ready".
 */
export function markReady(url: string): void {
  stateMap.set(normalizeUrl(url), "ready");
}

/** Returns true only after ARViewer has fully decoded the model. */
export function isModelReady(url: string): boolean {
  return stateMap.get(normalizeUrl(url)) === "ready";
}

export function getLoadState(url: string): LoadState {
  return stateMap.get(normalizeUrl(url)) ?? "idle";
}

/**
 * Mounts a no-src model-viewer to trigger WebGL context initialisation
 * immediately on page load instead of on first AR click (~600ms cold-start).
 */
let webglWarmed = false;
export function warmWebGL(): void {
  if (typeof window === "undefined" || webglWarmed) return;
  webglWarmed = true;
  const el = document.createElement("model-viewer" as "div") as HTMLElement;
  el.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;top:0;left:0";
  document.body.appendChild(el);
}

/**
 * Network-prefetch the first N above-fold AR models on page load.
 * Respects Save-Data and slow connections.
 */
export function preloadAboveFold(urls: string[], limit = 2): void {
  if (typeof window === "undefined") return;

  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  const isSlow =
    connection?.saveData ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g";

  if (isSlow) return;

  urls.slice(0, limit).forEach((url) => preloadModel(url));
}
