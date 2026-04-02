"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2 } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
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

const MAX_MODEL_SIZE = 5 * 1024 * 1024; // 5 MB

function isValidGlbUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      u.pathname.endsWith(".glb")
    );
  } catch {
    return false;
  }
}

interface ARViewerProps {
  src: string;
  name: string;
  poster?: string;
  onClose: () => void;
}

export function ARViewer({ src, name, poster, onClose }: ARViewerProps) {
  const [status, setStatus] = useState<
    "validating" | "loading" | "ready" | "error"
  >("validating");
  const [arSupported, setArSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const viewerRef = useRef<HTMLElement>(null);

  // Validate URL + HEAD check for max file size
  useEffect(() => {
    if (!isValidGlbUrl(src)) {
      setStatus("error");
      setErrorMsg("Geçersiz model URL'si");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(src, { method: "HEAD" });
        if (cancelled) return;

        if (!res.ok) {
          setStatus("error");
          setErrorMsg("Model dosyası bulunamadı");
          return;
        }

        const size = parseInt(
          res.headers.get("content-length") || "0",
          10
        );
        if (size > MAX_MODEL_SIZE) {
          setStatus("error");
          setErrorMsg("Model dosyası çok büyük (maks 5 MB)");
          return;
        }

        setStatus("loading");
      } catch {
        // HEAD may fail due to CORS — still try loading
        if (!cancelled) setStatus("loading");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  // model-viewer load/error events
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

  // Detect AR support
  useEffect(() => {
    const el = viewerRef.current as any;
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
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm truncate pr-2">
            {name}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Viewer */}
        <div className="relative aspect-square bg-muted">
          {(status === "validating" || status === "loading") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                AR yükleniyor...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2 px-6 text-center">
              <p className="text-sm text-destructive font-medium">
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-muted-foreground underline"
              >
                Kapat
              </button>
            </div>
          )}

          {status !== "error" && status !== "validating" && (
            <model-viewer
              ref={viewerRef as any}
              src={src}
              alt={`${name} 3D model`}
              ar={arSupported}
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              auto-rotate
              shadow-intensity="1"
              loading="lazy"
              poster={poster}
              style={{
                width: "100%",
                height: "100%",
                opacity: status === "ready" ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 text-center">
          {arSupported ? (
            <p className="text-xs text-muted-foreground">
              Masanızda görmek için AR butonuna dokunun
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Cihazınız AR desteklemiyor — 3D modeli döndürerek inceleyebilirsiniz
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
