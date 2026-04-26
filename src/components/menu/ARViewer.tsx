"use client";

/**
 * FIXED ARViewer
 * 1. Added precomputedScale prop for iOS Quick Look baked scaling
 * 2. normalizeScale zero-dimension retry limit and runtime fallback
 * 3. Merged load effect for React 18 safety and AR support check
 * 4. Static ar-scale="auto" and conditional static scale attribute
 * 5. Removed UI debug output (arScale state) and fixed Turkish locale
 * 6. Removed redundant AR support useEffect
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { X, Box } from "lucide-react";
import { isModelReady } from "@/lib/arPreloader";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "ar-scale"?: string;
          "ar-placement"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "min-camera-orbit"?: string;
          "max-camera-orbit"?: string;
          "shadow-intensity"?: string;
          "shadow-softness"?: string;
          loading?: string;
          poster?: string;
          scale?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

// ── Category-based real-world size defaults (centimetres) ─────────────────
// Priority: sizeCm (admin override) → category match → default
// These map CATEGORY NAMES (lowercased) to longest real-world dimension.
export const CATEGORY_SIZE_CM: Record<string, number> = {
  burger:  12,
  pizza:   28,
  kebab:   22,
  drink:   15,
  içecek:  15,  // Turkish alias
  dessert: 10,
  tatlı:   10,  // Turkish alias
  default: 20,
};

// ── Hard scale clamp for realistic food on a table ────────────────────────
// 0.03 = smallest possible (tiny dessert spoon)
// 0.80 = largest possible (large pizza plate)
const MIN_SCALE = 0.03;
const MAX_SCALE = 0.80;

interface ARViewerProps {
  src: string;
  name: string;
  sizeCm?: number | null;
  /** Human-readable category name (e.g. "Pizza", "Burger"). Lowercased before lookup. */
  category?: string | null;
  poster?: string;
  precomputedScale?: number | null;
  onClose: () => void;
}

// ── ModelViewer element shape (only what we need) ────────────────────────
interface ModelViewerElement extends HTMLElement {
  canActivateAR?: boolean;
  getDimensions?: () => { x: number; y: number; z: number };
  updateFraming?: () => void;
}

export function ARViewer({ src, name, sizeCm, category, poster, precomputedScale, onClose }: ARViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "timeout">(
    () => (isModelReady(src) ? "ready" : "loading")
  );
  const [arSupported, setArSupported] = useState(true);
  const viewerRef = useRef<ModelViewerElement>(null);

  // ── Static scale for iOS Quick Look ─────────────────────────────────────
  const staticScale = useMemo(() => {
    if (precomputedScale == null) return undefined;
    const sv = precomputedScale.toFixed(6);
    return `${sv} ${sv} ${sv}`;
  }, [precomputedScale]);

  // ── Scale normalization ───────────────────────────────────────────────────
  // PRIORITY ORDER:
  //   1. sizeCm — admin sets exact size per product
  //   2. category — matched against CATEGORY_SIZE_CM table
  //   3. default — 20cm fallback
  //
  // FORMULA:
  //   scale = targetM / maxDim   (clean ratio, no unit heuristics)
  //   scale = clamp(scale, 0.03, 0.80)
  const normalizeScale = useCallback((el: ModelViewerElement) => {
    if (typeof el.getDimensions !== "function") return;

    const dim = el.getDimensions();
    // Guard: if model hasn't loaded geometry yet, retry next frame
    if (!dim || (dim.x === 0 && dim.y === 0 && dim.z === 0)) {
      const attempts = (normalizeScale as any)._attempts ?? 0;
      if (attempts > 30) return; // broken model, give up
      (normalizeScale as any)._attempts = attempts + 1;
      requestAnimationFrame(() => normalizeScale(el));
      return;
    }
    (normalizeScale as any)._attempts = 0;

    const maxDim = Math.max(dim.x, dim.y, dim.z);
    if (maxDim <= 0) return;

    const catKey = category?.toLocaleLowerCase('en-US').trim() ?? "";
    const targetCm = (sizeCm != null && sizeCm > 0)
      ? sizeCm
      : (CATEGORY_SIZE_CM[catKey] ?? CATEGORY_SIZE_CM.default);
    const targetM = targetCm / 100;

    const scale = Math.min(Math.max(targetM / maxDim, MIN_SCALE), MAX_SCALE);
    const sv = scale.toFixed(6);

    el.setAttribute("scale", `${sv} ${sv} ${sv}`);
    el.setAttribute("ar-placement", "floor");
    el.setAttribute("ar-scale", "auto"); // allow user pinch as fallback

    console.log("[ARViewer] scale", { model: name, category: catKey, dim, maxDim, targetCm, scale });
  }, [sizeCm, category, name]);

  // ── model-viewer load / error events ──────────────────────────────────
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    
    let unmounted = false;
    
    // 10s timeout fallback: if model doesn't load, degrade gracefully to poster
    const fallbackTimer = setTimeout(() => {
      if (!unmounted) setStatus("timeout");
    }, 10000);

    const onLoad = () => {
      if (unmounted) return;
      clearTimeout(fallbackTimer);
      setStatus("ready");
      if (!precomputedScale) normalizeScale(el);
      if (el.canActivateAR !== undefined) setArSupported(!!el.canActivateAR);
    };
    
    const onError = () => { 
      if (!unmounted) {
        clearTimeout(fallbackTimer);
        setStatus("error"); 
      }
    };

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    
    return () => { 
      unmounted = true; 
      clearTimeout(fallbackTimer);
      el.removeEventListener("load", onLoad); 
      el.removeEventListener("error", onError); 
    };
  }, [normalizeScale, precomputedScale]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleClose]);

  const displaySize = sizeCm ?? (CATEGORY_SIZE_CM[category?.toLocaleLowerCase('en-US').trim() ?? ""] ?? null);

  return (
    <>
      <style>{`
        @keyframes arScaleIn {
          from { opacity: 0; transform: scale(0.93) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .ar-panel {
          animation: arScaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .ar-shimmer {
          background: linear-gradient(90deg,
            hsl(var(--muted)) 25%,
            hsl(var(--muted-foreground) / 0.12) 50%,
            hsl(var(--muted)) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={handleClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <div
          onClick={(e) => e.stopPropagation()}
          className="ar-panel relative z-10 w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Box className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground text-sm truncate">{name}</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0 ml-2"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Viewer area */}
          <div className="relative aspect-square bg-muted">

            {/* Poster image — shown immediately, fades out when model is ready */}
            {poster && status !== "ready" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt={name}
                className="absolute inset-0 w-full h-full object-cover z-10"
                style={{ transition: "opacity 0.4s ease" }}
              />
            )}

            {/* Shimmer overlay while loading */}
            {status === "loading" && (
              <div className="absolute inset-0 ar-shimmer z-20 opacity-60" />
            )}



            {status !== "error" && status !== "timeout" && (
              <model-viewer
                ref={viewerRef as React.RefObject<HTMLElement>}
                src={src}
                alt={`${name} 3D model`}
                ar={arSupported}
                ar-modes="webxr scene-viewer quick-look"
                ar-placement="floor"
                ar-scale="auto"
                camera-controls
                auto-rotate={false}
                min-camera-orbit="auto auto 0.3m"
                max-camera-orbit="auto auto 2m"
                shadow-intensity="1.5"
                shadow-softness="0.9"
                loading="eager"
                poster={poster}
                {...(staticScale ? { scale: staticScale } : {})}
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: status === "ready" ? 1 : 0,
                  transition: "opacity 0.5s ease",
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 text-center">
            {arSupported ? (
              <p className="text-xs text-muted-foreground">
                AR görünümü için sağ alt köşedeki butona dokunun
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cihazınız AR desteklemiyor — 3D modeli döndürerek inceleyebilirsiniz
              </p>
            )}
            {displaySize != null && (
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Gerçek boyut: ~{displaySize} cm
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
