"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Gift, Flame, Sparkles, ShoppingBag, ChevronDown } from "lucide-react";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import { useCart } from "@/components/menu/CartProvider";

function useOptionalCart() {
  try {
    return useCart();
  } catch {
    return null;
  }
}

/**
 * Full-screen loyalty panel — the "mini app" experience.
 * Opens from CoffeeClubButton, shows progress, rewards, bonuses.
 */
export function CoffeeClubPanel() {
  const loyalty = useLoyalty();
  const cart = useOptionalCart();
  const [addedToCart, setAddedToCart] = useState(false);

  const isOpen = loyalty?.panelOpen ?? false;
  const progress = loyalty?.progress;

  // Reset "added" state when panel opens
  useEffect(() => {
    if (isOpen) setAddedToCart(false);
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") loyalty?.setPanelOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, loyalty]);

  const handleClose = useCallback(() => {
    loyalty?.setPanelOpen(false);
  }, [loyalty]);

  const handleAddReward = useCallback(() => {
    if (!cart || !loyalty?.rewardItem) return;

    // Check if reward is already in cart
    const existing = cart.items.find((i) => i.type === "loyalty_reward");
    if (existing) {
      setAddedToCart(true);
      return;
    }

    cart.addItem({
      menuItemId: loyalty.rewardItem.menuItemId || `reward_${Date.now()}`,
      name: loyalty.rewardItem.name,
      price: 0,
      image: loyalty.rewardItem.image || "",
      type: "loyalty_reward",
    });
    setAddedToCart(true);
  }, [cart, loyalty]);

  const handleOrderNow = useCallback(() => {
    loyalty?.setPanelOpen(false);
    // Scroll to top of menu
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loyalty]);

  if (!isOpen || !progress) return null;

  const target = progress.progress.target;
  const current = progress.progress.current % target;
  const stampsAway = progress.bonuses.stampsAway;
  const rewardReady = progress.reward.ready;
  const clubName = loyalty?.clubName || "Coffee Club";
  const rewardItem = loyalty?.rewardItem;

  // Check if reward already in cart
  const rewardInCart = cart?.items.some((i) => i.type === "loyalty_reward") ?? false;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel — slides up from bottom, full height */}
      <div className="relative z-10 mt-auto w-full max-w-[480px] mx-auto h-[92vh] bg-background rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <h2 className="text-xl font-bold text-foreground">{clubName}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-5">
          {/* Stamp Track */}
          <StampTrack current={current} target={target} />

          {/* Progress message */}
          <div className="text-center">
            {rewardReady ? (
              <p className="text-lg font-bold text-amber-600">
                🎉 Ödülünüz Hazır!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{stampsAway}</span> sipariş sonra →{" "}
                <span className="font-semibold text-primary">
                  {rewardItem?.name || "ÖDÜL"}
                </span>
              </p>
            )}
          </div>

          {/* ── Reward Section ── */}
          {rewardReady && rewardItem && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-700">Reward Unlocked!</h3>
              </div>

              {/* Reward item card */}
              <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-amber-100 shadow-sm">
                {rewardItem.image ? (
                  <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={rewardItem.image}
                      alt={rewardItem.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 shrink-0 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Gift className="w-7 h-7 text-amber-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{rewardItem.name}</p>
                  <p className="text-sm text-green-600 font-semibold">FREE</p>
                </div>
              </div>

              {/* Add to Cart CTA */}
              {cart && (
                <button
                  type="button"
                  onClick={handleAddReward}
                  disabled={rewardInCart || addedToCart}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    rewardInCart || addedToCart
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98] shadow-md"
                  }`}
                >
                  {rewardInCart || addedToCart ? (
                    <>✓ Sepete Eklendi</>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Sepete Ekle
                    </>
                  )}
                </button>
              )}

              {/* Expiry */}
              {progress.reward.expiresAt && (
                <p className="text-xs text-amber-500 text-center">
                  {getExpiryText(progress.reward.expiresAt)}
                </p>
              )}
            </div>
          )}

          {/* ── Active Bonuses ── */}
          {(progress.bonuses.happyHour || progress.bonuses.nearCompletion) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Aktif Bonuslar
              </h3>

              {progress.bonuses.happyHour && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-700">
                      ✨ {progress.bonuses.multiplier}x Puan Aktif
                    </p>
                    <p className="text-xs text-purple-500">
                      Happy Hour — her sipariş {progress.bonuses.multiplier}x puan kazandırır
                    </p>
                  </div>
                </div>
              )}

              {progress.bonuses.nearCompletion && !rewardReady && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200">
                  <Flame className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700">
                      🔥 Sadece {stampsAway} sipariş kaldı!
                    </p>
                    <p className="text-xs text-orange-500">
                      Ödülüne çok az kaldı — devam et!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Upsell ── */}
          {progress.upsell && !rewardReady && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-blue-700">{progress.upsell.message}</p>
            </div>
          )}
        </div>

        {/* ── Sticky Footer CTA ── */}
        <div className="absolute bottom-0 inset-x-0 bg-background border-t px-5 py-4">
          <button
            type="button"
            onClick={handleOrderNow}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Sipariş Ver
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stamp Track (visual stamps) ─── */
function StampTrack({ current, target }: { current: number; target: number }) {
  // Limit visual stamps to max 12 for layout; beyond that use a progress bar
  const useVisualStamps = target <= 12;

  if (!useVisualStamps) {
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {current} / {target}
          </p>
          <p className="text-xs text-muted-foreground">{percent}%</p>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 py-2">
      {Array.from({ length: target }, (_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
              filled
                ? "bg-primary/10 scale-100"
                : "bg-muted scale-90 opacity-50"
            }`}
          >
            {filled ? "☕" : "○"}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Helpers ─── */
function getExpiryText(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi dolmuş";
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return "Son gün! ⏰";
  return `${days} gün kaldı ⏰`;
}
