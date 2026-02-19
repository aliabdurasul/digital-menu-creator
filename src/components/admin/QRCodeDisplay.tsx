"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import { QRCodeCanvas } from "qrcode.react";

export interface QRCodeDisplayHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface QRCodeDisplayProps {
  /** The full URL to encode in the QR code */
  url: string;
  /** Display size in CSS pixels (canvas renders at 2x for print quality) */
  size?: number;
  /** Optional logo URL to overlay in the center (Pro plan feature) */
  logoUrl?: string;
  /** Background color */
  bgColor?: string;
  /** Foreground (pattern) color */
  fgColor?: string;
}

/**
 * Modular QR Code display component.
 *
 * Uses canvas-based rendering for high-quality PNG export.
 * Renders at 2x internal resolution for crisp printing.
 *
 * Future extensions:
 * - Add restaurant logo inside QR center (imageSettings prop)
 * - Different QR styles (Pro plan)
 * - QR scan tracking via URL parameters
 * - Analytics integration
 */
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

    useImperativeHandle(ref, () => ({
      getCanvas: () => {
        if (!containerRef.current) return null;
        return containerRef.current.querySelector("canvas");
      },
    }));

    return (
      <div
        ref={containerRef}
        className="inline-flex items-center justify-center rounded-2xl bg-white p-6"
      >
        <QRCodeCanvas
          value={url}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level="H" // High error correction — supports up to 30% damage, needed for future logo overlay
          marginSize={2}
          imageSettings={
            logoUrl
              ? {
                  src: logoUrl,
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
