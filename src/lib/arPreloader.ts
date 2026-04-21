/**
 * arPreloader — client-side singleton that silently preloads GLB models
 * by mounting hidden <model-viewer> elements. The GPU buffer stays warm
 * so that when the user opens ARViewer, the model is already decoded.
 *
 * Usage:
 *   preloadModel(url)          — start fetching/decoding a model
 *   isModelReady(url)          — true when fully loaded into GPU
 *   getLoadState(url)          — "idle" | "loading" | "ready" | "error"
 *   warmWebGL()                — mount a 1px model-viewer to init WebGL context early
 */

export type LoadState = "idle" | "loading" | "ready" | "error";

// These maps persist for the entire browser session (module-level singletons)
const stateMap = new Map<string, LoadState>();
const elementMap = new Map<string, HTMLElement>();
let webglWarmed = false;

export function preloadModel(url: string): void {
  if (typeof window === "undefined") return;
  const current = stateMap.get(url);
  if (current === "ready" || current === "loading") return;

  stateMap.set(url, "loading");

  const el = document.createElement("model-viewer" as "div") as HTMLElement;
  el.setAttribute("src", url);
  el.setAttribute("loading", "eager");
  el.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;top:0;left:0";

  el.addEventListener(
    "load",
    () => {
      stateMap.set(url, "ready");
      // Keep element alive — evicting it would release the GPU buffer
    },
    { once: true }
  );

  el.addEventListener(
    "error",
    () => {
      stateMap.set(url, "error");
      el.remove();
      elementMap.delete(url);
    },
    { once: true }
  );

  document.body.appendChild(el);
  elementMap.set(url, el);
}

export function isModelReady(url: string): boolean {
  return stateMap.get(url) === "ready";
}

export function getLoadState(url: string): LoadState {
  return stateMap.get(url) ?? "idle";
}

/**
 * Mounts a no-src model-viewer to trigger WebGL context initialisation
 * immediately on page load instead of on first AR click (~600ms cold-start).
 */
export function warmWebGL(): void {
  if (typeof window === "undefined" || webglWarmed) return;
  webglWarmed = true;

  const el = document.createElement("model-viewer" as "div") as HTMLElement;
  el.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;top:0;left:0";
  document.body.appendChild(el);
}

/**
 * Priority-aware bulk preload.
 * - aboveFold (first N items): start immediately
 * - rest: use IntersectionObserver in the component
 * Respects Save-Data / slow connections.
 */
export function preloadAboveFold(urls: string[], limit = 3): void {
  if (typeof window === "undefined") return;

  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  const isSlow =
    connection?.saveData ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g";

  if (isSlow) return; // let hover/touchstart handle it on slow connections

  urls.slice(0, limit).forEach((url) => preloadModel(url));
}
