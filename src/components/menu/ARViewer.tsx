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
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

interface ARViewerProps {
  src: string;
  name: string;
  sizeCm?: number | null;
  poster?: string;
  onClose: () => void;
}

export function ARViewer({ src, name, sizeCm, poster, onClose }: ARViewerProps) {
  // If the preloader already has this model warm, start as "ready" immediately
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    () => (isModelReady(src) ? "ready" : "loading")
  );
  const [arSupported, setArSupported] = useState(true);
  const viewerRef = useRef<HTMLElement>(null);

  const scaleMetre = ((sizeCm ?? 20) / 100).toFixed(3);

  // model-viewer load / error events
  useEffect(() => {
    if (status === "ready") return; // already warm — skip listeners
    const el = viewerRef.current;
    if (!el) return;

    const onLoad = () => setStatus("ready");
    const onError = () => setStatus("error");

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  }, [status]);

  // Detect AR support after model loads
  useEffect(() => {
    const el = viewerRef.current as (HTMLElement & { canActivateAR?: boolean }) | null;
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
                ar-scale="fixed"
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
                  ["--model-scale" as string]: scaleMetre,
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
          loading?: string;
          poster?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

