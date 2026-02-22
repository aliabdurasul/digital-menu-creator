"use client";

import { useRef, useCallback, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";

export interface QRCodeDisplayHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  logoUrl?: string;
  bgColor?: string;
  fgColor?: string;
}

/** Convert external URL → data-URL so canvas stays CORS-clean. */
async function toDataUrl(src: string): Promise<string | undefined> {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

const QRCodeDisplay = forwardRef<QRCodeDisplayHandle, QRCodeDisplayProps>(
  function QRCodeDisplay(
    {
      url,
      size = 300,
      logoUrl,
      bgColor = "#FFFFFF",
      fgColor = "#000000",
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [safeLogoUrl, setSafeLogoUrl] = useState<string | undefined>(undefined);

    // Pre-fetch logo as data-URL to avoid CORS-tainted canvas
    useEffect(() => {
      setSafeLogoUrl(undefined);
      if (!logoUrl) return;
      let cancelled = false;
      toDataUrl(logoUrl).then((dataUrl) => {
        if (!cancelled) setSafeLogoUrl(dataUrl);
      });
      return () => { cancelled = true; };
    }, [logoUrl]);

    const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
    }, []);

    useImperativeHandle(ref, () => ({
      getCanvas: () => {
        return canvasRef.current || containerRef.current?.querySelector("canvas") || null;
      },
    }));

    return (
      <div
        ref={containerRef}
        className="inline-flex items-center justify-center rounded-2xl bg-white p-6"
      >
        <QRCodeCanvas
          ref={setCanvasRef}
          value={url}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level="H"
          marginSize={2}
          imageSettings={
            safeLogoUrl
              ? {
                  src: safeLogoUrl,
                  x: undefined,
                  y: undefined,
                  height: size * 0.2,
                  width: size * 0.2,
                  excavate: true,
                }
              : undefined
          }
        />
      </div>
    );
  }
);

export { QRCodeDisplay };
