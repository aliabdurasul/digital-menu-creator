"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Plus, Minus, Trash2, CheckCircle2, Loader2, Bell, Gift } from "lucide-react";
import { useCart } from "@/components/menu/CartProvider";
import { Button } from "@/components/ui/button";
import { PhoneCapture, getCapturedPhone, getCapturedName } from "@/components/menu/PhoneCapture";
import { generateCafeSessionCode } from "@/lib/utils";
import { getOrCreateCustomerKey } from "@/lib/loyalty-client";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import type { LoyaltyProgressResponse } from "@/types";


interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  /** Specific table for table-delivery. Undefined for self-service orders. */
  tableId?: string;
  moduleType?: "cafe" | "restaurant";
}

export function CartDrawer({ open, onClose, restaurantId, tableId, moduleType = "restaurant" }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneCapture, setShowPhoneCapture] = useState(false);
  const loyalty = useLoyalty();

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
      const customerKey = getOrCreateCustomerKey();

      // Include reward items with their type
      const orderItems = items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        ...(i.type === "loyalty_reward" ? { type: "loyalty_reward", name: i.name } : {}),
        ...(i.type === "point_store_reward" ? { type: "point_store_reward", name: i.name, redemptionId: i.redemptionId } : {}),
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId,
          sessionId: sid,
          customerKey,
          items: orderItems,
          note: note.trim() || undefined,
          ...(customerPhone ? { customerPhone } : {}),
          ...(getCapturedName() ? { customerName: getCapturedName() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sipariş gönderilemedi");
      }

      const data = await res.json();

      // Use loyalty data from order response immediately (no extra fetch needed)
      if (data.loyalty && loyalty?.updateFromResponse) {
        loyalty.updateFromResponse(data.loyalty);
      } else {
        loyalty?.refetch();
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
          <OrderSuccessScreen moduleType={moduleType} restaurantId={restaurantId} onClose={handleClose} />
        ) : (
          <>
            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Sepetiniz boş
                </p>
              ) : (
                items.map((item) => {
                  const isReward = item.type === "loyalty_reward" || item.type === "point_store_reward";
                  return (
                  <div
                    key={item.lineId}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${
                      isReward ? "bg-amber-50 border-amber-200" : "bg-card"
                    }`}
                  >
                    {/* Thumbnail */}
                    {isReward ? (
                      <div className="w-14 h-14 shrink-0 rounded-md bg-amber-100 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-amber-500" />
                      </div>
                    ) : item.image && item.image !== "/placeholder.svg" ? (
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
                      <div className="flex items-center gap-1.5">
                        {isReward && <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        <p className={`font-medium text-sm truncate ${isReward ? "text-amber-700" : ""}`}>
                          {isReward ? item.name.toUpperCase() : item.name}
                        </p>
                      </div>
                      {isReward ? (
                        <span className="text-xs font-semibold text-green-600">
                          {item.menuItemId?.startsWith("loyalty_discount_")
                            ? "🏷 İNDİRİM ÖDÜLÜ"
                            : item.menuItemId?.startsWith("secret_reward_")
                              ? "🎁 GİZLİ İNDİRİM ÖDÜLÜ"
                              : "FREE — LOYALTY REWARD"}
                        </span>
                      ) : (
                        <p className="text-primary font-semibold text-sm">
                          ₺{(item.price * item.quantity).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Quantity controls — reward items only get remove */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        {item.quantity === 1 || isReward ? (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {!isReward && (
                        <>
                          <span className="text-sm font-semibold w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                            className="w-7 h-7 rounded-full border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* ── Cart Upsell Banner ── */}
            <CartUpsell progress={loyalty?.progress ?? null} />

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
                  {(() => {
                    const hasStampDiscount = items.some((i) => i.menuItemId?.startsWith("loyalty_discount_"));
                    const hasSecretDiscount = items.some((i) => i.menuItemId?.startsWith("secret_reward_"));
                    const hasDiscount = hasStampDiscount || hasSecretDiscount;
                    const paid = items.filter((i) => !i.type).reduce((s, i) => s + i.price * i.quantity, 0);
                    let discounted = paid;
                    if (hasStampDiscount) {
                      const rType = loyalty?.progress?.reward?.type;
                      const rVal = loyalty?.progress?.reward?.value ?? 0;
                      discounted = rType === "discount_percent"
                        ? discounted * (1 - rVal / 100)
                        : Math.max(0, discounted - rVal);
                    }
                    if (hasSecretDiscount) {
                      const pct = loyalty?.progress?.secretReward?.discountPercent ?? 0;
                      discounted = Math.max(0, discounted * (1 - pct / 100));
                    }
                    if (hasDiscount && discounted < totalPrice) {
                      return (
                        <>
                          Sipariş Ver —{" "}
                          <s className="opacity-50 text-sm mx-1">₺{totalPrice.toFixed(2)}</s>
                          ₺{discounted.toFixed(2)}
                        </>
                      );
                    }
                    return `Sipariş Ver — ₺${totalPrice.toFixed(2)}`;
                  })()
                  }
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Phone Capture Modal */}
      {showPhoneCapture && (
        <PhoneCapture
          required={false}
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

/* ─── Order Success Screen ─── */
function OrderSuccessScreen({
  moduleType,
  restaurantId,
  onClose,
}: {
  moduleType: string;
  restaurantId: string;
  onClose: () => void;
}) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const loyalty = useLoyalty();
  const isCafe = moduleType === "cafe";
  const customerKey = typeof window !== "undefined" ? getOrCreateCustomerKey() : undefined;

  useEffect(() => {
    const sid = sessionStorage.getItem("session_id");
    setSessionCode(sid);
  }, []);

  const pushStatus = loyalty?.pushStatus ?? "idle";
  const progress = loyalty?.progress;
  const rewardReady = progress?.reward.ready ?? false;
  const progressInCycle = progress
    ? progress.progress.current % progress.progress.target
    : null;
  const stampsAway = progress?.bonuses.stampsAway ?? null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500" />
      <h3 className="text-xl font-bold">Siparişiniz Alındı!</h3>
      {isCafe && sessionCode && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-3">
          <p className="text-xs text-muted-foreground">Sipariş Kodunuz</p>
          <p className="text-2xl font-mono font-bold text-primary tracking-wider">{sessionCode}</p>
        </div>
      )}
      <p className="text-muted-foreground text-sm max-w-xs">
        {isCafe
          ? "Siparişiniz baristaya iletildi. Self servis gelip almanız rica edilir."
          : "Siparişiniz mutfağa iletildi. Hazır olduğunda masanıza getirilecektir."}
      </p>

      {/* C1 — Loyalty progress update (highest dopamine moment) */}
      {progress && progressInCycle !== null && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-center ${
            rewardReady
              ? "bg-amber-50 border-amber-200"
              : "bg-primary/5 border-primary/20"
          }`}
        >
          {rewardReady ? (
            <p className="text-sm font-bold text-amber-700">🔓 Ödül Kilidi Açıldı!</p>
          ) : (
            <p className="text-sm font-semibold text-primary">
              ☕ {progressInCycle}/{progress.progress.target}
              {stampsAway !== null && stampsAway > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  · {stampsAway} sipariş kaldı
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* C3 — Upsell message from server */}
      {progress?.upsell && (
        <p className="text-xs text-muted-foreground italic">{progress.upsell.message}</p>
      )}

      {/* Push opt-in — uses canonical LoyaltyProvider flow */}
      {isCafe && pushStatus === "idle" && (
        <button
          type="button"
          onClick={() => loyalty?.triggerPushSheet("manual")}
          className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          <Bell className="w-4 h-4" />
          Hazır olunca bildir
        </button>
      )}
      {isCafe && pushStatus === "granted" && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Bell className="w-3.5 h-3.5" /> Bildirim açık ✓
        </p>
      )}

      {/* Return to menu CTA */}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-sm font-semibold text-primary hover:underline transition-colors"
      >
        ← Menüye Dön
      </button>
    </div>
  );
}

/* ─── Cart Upsell Banner ─── */
function CartUpsell({ progress }: { progress: LoyaltyProgressResponse | null }) {
  if (!progress) return null;

  const stampsAway = progress.bonuses.stampsAway;
  const rewardItem = progress.rewardItem;
  const current = progress.progress.current % progress.progress.target;
  const target = progress.progress.target;

  // Near-completion upsell
  if (stampsAway <= 3 && stampsAway > 1 && !progress.reward.ready) {
    return (
      <div className="mx-5 mb-1 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
        <p className="text-xs text-blue-600">
          {stampsAway} sipariş sonra → {rewardItem?.name || "ÜCRETSİZ kahve"} ☕
        </p>
      </div>
    );
  }

  // Stamp preview: show current progress and what this order earns
  if (!progress.reward.ready && current < target) {
    return (
      <div className="mx-5 mb-1 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <p className="text-xs text-primary">
          ☕ Bu sipariş +1 damga · {current}/{target}
          {stampsAway === 1 && " · Son sipariş — ödül geliyor!"}
        </p>
      </div>
    );
  }

  return null;
}
