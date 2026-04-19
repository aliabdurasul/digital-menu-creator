"use client";

import { useRef, useCallback } from "react";
import type { Restaurant } from "@/types";
import {
  QRCodeDisplay,
  type QRCodeDisplayHandle,
} from "@/components/admin/QRCodeDisplay";
import { Button } from "@/components/ui/button";
import {
  Download,
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

  // Build the public menu URL using the restaurant slug
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://lezzetiala.prestigeyazilim.app";
  const publicUrl = `${appUrl}/r/${restaurant.slug}`;
  const isCafe = restaurant.moduleType === "cafe";

  // ── Subscription check ──
  if (!restaurant.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-warning/10 rounded-2xl mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Abonelik Pasif
          </h2>
          <p className="text-sm text-muted-foreground">
            Aboneliğiniz pasif olduğu için QR kod oluşturma devre dışıdır.
            Bu özelliği kullanmak için lütfen aboneliğinizi yeniden etkinleştirin.
          </p>
        </div>
      </div>
    );
  }

  // ── Download QR as PNG ──
  const handleDownload = useCallback(async () => {
    try {
      let canvas = qrRef.current?.getCanvas();

      // Retry once after short delay if canvas not ready (logo image still loading)
      if (!canvas) {
        await new Promise((r) => setTimeout(r, 200));
        canvas = qrRef.current?.getCanvas();
      }

      if (!canvas) {
        toast.error("QR görüntüsü oluşturulamadı. Lütfen tekrar deneyin.");
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

      // Draw QR code centered (includes logo if rendered by qrcode.react)
      ctx.drawImage(canvas, padding, padding);

      // Use toBlob for more reliable download
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error("QR kodu oluşturulamadı. Lütfen tekrar deneyin.");
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `${restaurant.slug}-qr-code.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("QR kod başarıyla indirildi!");
        },
        "image/png",
        1.0
      );
    } catch {
      // CORS tainted canvas or other error — retry without logo
      try {
        const fallbackCanvas = document.createElement("canvas");
        const size = 300;
        const padding = 40;
        fallbackCanvas.width = size + padding * 2;
        fallbackCanvas.height = size + padding * 2;
        const ctx = fallbackCanvas.getContext("2d");
        if (!ctx) {
          toast.error("QR kodu indirilemedi.");
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);

        // Get the raw QR canvas without logo via DOM query
        const rawCanvas = document.querySelector<HTMLCanvasElement>(
          "[data-qr-container] canvas"
        );
        if (rawCanvas) {
          ctx.drawImage(rawCanvas, padding, padding);
        }

        fallbackCanvas.toBlob(
          (blob) => {
            if (!blob) {
              toast.error("QR kodu oluşturulamadı.");
              return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = `${restaurant.slug}-qr-code.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("QR kod indirildi!");
          },
          "image/png",
          1.0
        );
      } catch {
        toast.error("QR kodu indirilemedi. Lütfen tekrar deneyin.");
      }
    }
  }, [restaurant.slug]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isCafe ? "Self Servis QR" : "QR Menü"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-[52px]">
          {isCafe
            ? "Müşteriler bu kodu tarayarak menüyü görüntüler ve self servis sipariş verebilir."
            : "Müşteriler bu kodu tarayarak dijital menünüzü anlık olarak görüntüleyebilir."}
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
          <div data-qr-container className="border border-border/50 rounded-2xl shadow-inner bg-white">
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
              Menüyü Önizle
            </Button>
            <Button
              onClick={handleDownload}
              className="flex-1 h-11 gap-2"
              size="lg"
            >
              <Download className="w-4 h-4" />
              QR İndir
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-6 rounded-2xl bg-muted/50 border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Nasıl kullanılır
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bu QR kodu yazdırın ve masalarınıza yerleştirin, böylece müşterileriniz
          menünüze anlık olarak erişebilir. En iyi sonuç için beyaz zemin üzerine
          en az 3×3 cm boyutunda yazdırın. QR kod doğrudan canlı dijital
          menünüze yönlendirir.
        </p>
      </div>

      {/* Print Preview Hint */}
      <div className="mt-4 p-4 rounded-xl border border-dashed border-border/60 text-center">
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-medium">İpucu:</span> Profesyonel baskı için
          indirme düğmesini kullanarak yüksek çözünürlüklü PNG dosyası alın.
        </p>
      </div>
    </div>
  );
}
