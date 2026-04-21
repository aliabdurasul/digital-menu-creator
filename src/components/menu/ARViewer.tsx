"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Box } from "lucide-react";

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

const MAX_MODEL_SIZE = 50 * 1024 * 1024; // 50 MB

interface ARViewerProps {
  src: string;
  name: string;
  sizeCm?: number | null;
  poster?: string;
  onClose: () => void;
}

export function ARViewer({ src, name, sizeCm, poster, onClose }: ARViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [arSupported, setArSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const viewerRef = useRef<HTMLElement>(null);

  // Real-world scale: sizeCm / 100 metres. Default 15 cm when not set.
  const scaleMetre = ((sizeCm ?? 15) / 100).toFixed(3);

  // HEAD check — raise size limit to 50 MB; allow CDN URLs without .glb extension
  useEffect(() => {
    let cancelled = false;

    // Validate it is an http(s) URL
    try {
      const u = new URL(src);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        setStatus("error");
        setErrorMsg("Geçersiz model URL'si");
        return;
      }
    } catch {
      setStatus("error");
      setErrorMsg("Geçersiz model URL'si");
      return;
    }

    (async () => {
      try {
        const res = await fetch(src, { method: "HEAD" });
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setErrorMsg("Model dosyası bulunamadı");
          return;
        }
        const size = parseInt(res.headers.get("content-length") || "0", 10);
        if (size > MAX_MODEL_SIZE) {
          setStatus("error");
          setErrorMsg("Model dosyası çok büyük (maks 50 MB)");
          return;
        }
        if (!cancelled) setStatus("loading");
      } catch {
        // HEAD may fail due to CORS — proceed and let model-viewer handle errors
        if (!cancelled) setStatus("loading");
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  // model-viewer load / error events
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || status !== "loading") return;

    const onLoad = () => setStatus("ready");
    const onError = () => {
      setStatus("error");
      setErrorMsg("Model yüklenemedi");
    };

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
    el.addEventListener("load", check);
    return () => el.removeEventListener("load", check);
  }, []);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleClose]);

  return (
    <>
      {/* Premium scale-in animation */}
      <style>{`
        @keyframes arScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .ar-panel {
          animation: arScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .shimmer {
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

          {/* Viewer */}
          <div className="relative aspect-square bg-muted">
            {/* Shimmer skeleton shown while loading */}
            {status === "loading" && (
              <div className="absolute inset-0 shimmer z-10" />
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2 px-6 text-center">
                <Box className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-destructive font-medium">{errorMsg}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-muted-foreground underline"
                >
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
                shadow-intensity="1"
                loading="eager"
                poster={poster}
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: status === "ready" ? 1 : 0,
                  transition: "opacity 0.4s ease",
                  // Pass scale hint via CSS custom property for model-viewer
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
