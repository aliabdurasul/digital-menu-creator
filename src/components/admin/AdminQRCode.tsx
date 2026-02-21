"use client";

import { useRef, useState, useCallback } from "react";
import type { Restaurant } from "@/types";
import {
  QRCodeDisplay,
  type QRCodeDisplayHandle,
} from "@/components/admin/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import {
  Download,
  Copy,
  Check,
  QrCode,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface AdminQRCodeProps {
  restaurant: Restaurant;
}

/**
 * Production-ready QR Code admin page component.
 *
 * Features:
 * - Generates QR code from restaurant slug
 * - Download as high-resolution PNG
 * - Copy public URL to clipboard
 * - Subscription status check
 * - Premium minimal design (Stripe/Linear/Notion inspired)
 *
 * Future:
 * - Restaurant logo inside QR center
 * - QR style customization (Pro plan)
 * - Scan tracking & analytics
 */
export function AdminQRCode({ restaurant }: AdminQRCodeProps) {
  const qrRef = useRef<QRCodeDisplayHandle>(null);
  const [copied, setCopied] = useState(false);

  // Build the public menu URL using the restaurant slug
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com";
  const publicUrl = `${appUrl}/menu/${restaurant.slug}`;

  // ── Subscription check ──
  if (!restaurant.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-warning/10 rounded-2xl mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Subscription Inactive
          </h2>
          <p className="text-sm text-muted-foreground">
            QR code generation is disabled while your subscription is inactive.
            Please reactivate your subscription to use this feature.
          </p>
        </div>
      </div>
    );
  }

  // ── Download QR as PNG ──
  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.getCanvas();
    if (!canvas) {
      toast.error("Could not generate QR image. Please try again.");
      return;
    }

    // Create a high-res export canvas with white padding
    const padding = 40;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + padding * 2;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw QR code centered
    ctx.drawImage(canvas, padding, padding);

    // Trigger download
    const link = document.createElement("a");
    link.download = `${restaurant.slug}-qr-code.png`;
    link.href = exportCanvas.toDataURL("image/png", 1.0);
    link.click();

    toast.success("QR code downloaded successfully!");
  }, [restaurant.slug]);

  // ── Copy URL to clipboard ──
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link. Please copy it manually.");
    }
  }, [publicUrl]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Your QR Code</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-[52px]">
          Customers can scan this code to view your digital menu instantly.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-8 sm:p-10 flex flex-col items-center text-center space-y-6">
          {/* Restaurant Name */}
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {restaurant.name}
            </h2>
            <button
              onClick={() => window.open(publicUrl, "_blank")}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="underline underline-offset-4 decoration-border group-hover:decoration-foreground transition-colors">
                {publicUrl}
              </span>
            </button>
          </div>

          {/* QR Code */}
          <div className="border border-border/50 rounded-2xl shadow-inner bg-white">
            <QRCodeDisplay
              ref={qrRef}
              url={publicUrl}
              size={300}
              logoUrl={restaurant.logo || undefined}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button
              onClick={() => window.open(publicUrl, "_blank")}
              className="flex-1 h-11 gap-2"
              variant="secondary"
              size="lg"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Menu
            </Button>
            <Button
              onClick={handleDownload}
              className="flex-1 h-11 gap-2"
              size="lg"
            >
              <Download className="w-4 h-4" />
              Download QR
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1 h-11 gap-2"
              size="lg"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-6 rounded-2xl bg-muted/50 border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          How to use
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Print this QR code and place it on your tables so customers can access
          your menu instantly. For best results, print at minimum 3×3 cm size on
          a white background. The QR code links directly to your live digital
          menu.
        </p>
      </div>

      {/* Print Preview Hint */}
      <div className="mt-4 p-4 rounded-xl border border-dashed border-border/60 text-center">
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-medium">Tip:</span> Use the download button
          to get a high-resolution PNG perfect for professional printing.
        </p>
      </div>
    </div>
  );
}
