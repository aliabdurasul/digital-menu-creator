"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
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

// ── Category-based real-world size fallbacks (centimetres) ────────────────
// Used when the admin has NOT set a custom sizeCm on the model.
// Values represent the longest real-world dimension of each food category.
const CATEGORY_SIZE_CM: Record<string, number> = {
  burger:  12,
  pizza:   28,
  drink:   15,
  dessert: 10,
  default: 20,
};

const MIN_SCALE = 0.01;
const MAX_SCALE = 5.0;

interface ARViewerProps {
  src: string;
  name: string;
  sizeCm?: number | null;
  poster?: string;
  onClose: () => void;
}

// ── ModelViewer element shape (only what we need) ────────────────────────
interface ModelViewerElement extends HTMLElement {
  canActivateAR?: boolean;
  getDimensions?: () => { x: number; y: number; z: number };
  updateFraming?: () => void;
}

export function ARViewer({ src, name, sizeCm, poster, onClose }: ARViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    () => (isModelReady(src) ? "ready" : "loading")
  );
  const [arSupported, setArSupported] = useState(true);
  const viewerRef = useRef<ModelViewerElement>(null);

  // ── Scale normalization ───────────────────────────────────────────────────
  // GLB files cannot be trusted to use consistent units (some ship in mm,
  // some in cm, some in metres). We always read the raw bounding box from
  // getDimensions(), detect the magnitude, correct for unit mismatch, then
  // drive the scale to the admin's target (sizeCm) or a category default.
  const normalizeScale = useCallback((el: ModelViewerElement) => {
    if (typeof el.getDimensions !== "function") return;

    const dim = el.getDimensions();
    if (!dim) return;

    const maxDim = Math.max(dim.x, dim.y, dim.z);
    if (!maxDim || maxDim <= 0) return;

    // STEP 1 — Resolve target size in metres
    const targetCm = sizeCm != null && sizeCm > 0
      ? sizeCm
      : (CATEGORY_SIZE_CM.default);
    const targetM = targetCm / 100;

    // STEP 2 — Base scale from bounding box
    let scaleFactor = targetM / maxDim;

    // STEP 3 — Anti-extreme unit correction
    // GLBs authored in the wrong unit arrive with absurd bounding-box values.
    // Correct multiplicatively so the final scaleFactor lands in a sane range.
    if      (maxDim > 5)    scaleFactor *= 0.01;  // authored in cm (100× too big)
    else if (maxDim > 1)    scaleFactor *= 0.1;   // authored in decimetres
    else if (maxDim < 0.01) scaleFactor *= 10;    // authored in decimetres (small)
    else if (maxDim < 0.001) scaleFactor *= 100;  // authored in mm (1000× too small)

    // STEP 4 — Hard clamp: never go completely microscopic or room-scale
    scaleFactor = Math.max(MIN_SCALE, Math.min(scaleFactor, MAX_SCALE));

    // STEP 5 — Apply via setAttribute (the correct model-viewer API)
    const s = scaleFactor.toFixed(6);
    el.setAttribute("scale", `${s} ${s} ${s}`);

    // STEP 6 — Reframe camera & recalculate bounding for AR floor alignment
    el.updateFraming?.();

    // STEP 7 — Debug log so deviations are visible in DevTools
    console.log("[ARViewer] scale normalization", {
      model:       name,
      dim,
      maxDim,
      targetCm,
      scaleFactor,
    });
  }, [sizeCm, name]);

  // ── model-viewer load / error events ──────────────────────────────────
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    // If preloader already warmed this model, the "load" event has already
    // fired — run normalisation immediately, don't re-attach listeners.
    if (status === "ready") {
      normalizeScale(el);
      return;
    }

    const onLoad = () => {
      setStatus("ready");
      normalizeScale(el);
    };
    const onError = () => setStatus("error");

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  // Re-run if sizeCm changes so live admin edits are reflected immediately
  }, [status, normalizeScale]);

  // ── Detect AR support after model loads ───────────────────────────────
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const check = () => {
      if (el.canActivateAR !== undefined) setArSupported(!!el.canActivateAR);
    };
    el.addEventListener("load", check, { once: true });
    return () => el.removeEventListener("load", check);
  }, []);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleClose]);

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

            {/* Shimmer overlay on top of poster while loading */}
            {status === "loading" && (
              <div className="absolute inset-0 ar-shimmer z-20 opacity-60" />
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-2 px-6 text-center bg-muted">
                <Box className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-destructive font-medium">Model yüklenemedi</p>
                <button type="button" onClick={handleClose} className="text-xs text-muted-foreground underline">
                  Kapat
                </button>
              </div>
            )}

            {status !== "error" && (
              <model-viewer
                ref={viewerRef as React.RefObject<HTMLElement>}
                src={src}
                alt={`${name} 3D model`}
                ar={arSupported}
                ar-modes="webxr scene-viewer quick-look"
                camera-controls
                auto-rotate
                shadow-intensity="1.2"
                shadow-softness="0.8"
                loading="eager"
                poster={poster}
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
            {sizeCm != null && (
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Gerçek boyut: ~{sizeCm} cm
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
