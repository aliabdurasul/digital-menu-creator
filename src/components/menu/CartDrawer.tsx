"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Plus, Minus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useCart } from "@/components/menu/CartProvider";
import { Button } from "@/components/ui/button";
import { PhoneCapture, getCapturedPhone, getCapturedName } from "@/components/menu/PhoneCapture";
import { generateCafeSessionCode } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  tableId: string;
  moduleType?: "cafe" | "restaurant";
}

export function CartDrawer({ open, onClose, restaurantId, tableId, moduleType = "restaurant" }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneCapture, setShowPhoneCapture] = useState(false);

  const handleSubmit = async (skipPhonePrompt = false) => {
    if (items.length === 0) return;

    // Check if phone is needed and not yet captured
    const capturedPhone = getCapturedPhone();
    if (!capturedPhone && moduleType === "cafe") {
      setShowPhoneCapture(true);
      return;
    }
    // For restaurant mode, show phone capture optionally if not captured yet
    if (!capturedPhone && !skipPhonePrompt) {
      setShowPhoneCapture(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Generate or reuse anonymous session ID
      let sid = sessionStorage.getItem("session_id");
      if (!sid) {
        sid = moduleType === "cafe" ? generateCafeSessionCode() : crypto.randomUUID();
        sessionStorage.setItem("session_id", sid);
      }

      const customerPhone = getCapturedPhone();

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId,
          sessionId: sid,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
          note: note.trim() || undefined,
          ...(customerPhone ? { customerPhone } : {}),
          ...(getCapturedName() ? { customerName: getCapturedName() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sipariş gönderilemedi");
      }

      clearCart();
      setNote("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet */}
      <div className="relative z-10 bg-background rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-lg">
            {success ? "Sipariş Gönderildi" : "Sepetiniz"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success screen */}
        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h3 className="text-xl font-bold">Siparişiniz Alındı!</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Siparişiniz mutfağa iletildi. Hazır olduğunda masanıza getirilecektir.
            </p>
            <Button onClick={handleClose} className="mt-2">
              Menüye Dön
            </Button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Sepetiniz boş
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center gap-3 p-2 rounded-lg bg-card border"
                  >
                    {/* Thumbnail */}
                    {item.image && item.image !== "/placeholder.svg" ? (
                      <div className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 shrink-0 rounded-md bg-muted" />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-primary font-semibold text-sm">
                        ₺{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Note + Submit */}
            {items.length > 0 && (
              <div className="border-t px-5 py-4 space-y-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Sipariş notu (opsiyonel)..."
                  rows={2}
                  className="w-full text-sm rounded-lg border bg-muted/30 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}

                <Button
                  onClick={() => { void handleSubmit(); }}
                  disabled={submitting}
                  className="w-full h-12 text-base font-semibold"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  Sipariş Ver — ₺{totalPrice.toFixed(2)}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Phone Capture Modal */}
      {showPhoneCapture && (
        <PhoneCapture
          required={moduleType === "cafe"}
          requireName={moduleType === "cafe"}
          onSubmit={() => {
            setShowPhoneCapture(false);
            handleSubmit(true);
          }}
          onSkip={() => {
            setShowPhoneCapture(false);
            handleSubmit(true);
          }}
        />
      )}
    </div>
  );
}
