"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Gift, ShoppingBag, ChevronDown, Bell, Flame, Zap } from "lucide-react";
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
 * Full-screen loyalty panel.
 * Shows: club name, stamp progress, next reward, push opt-in.
 * Intentionally minimal — no multipliers, bonuses, or internal details.
 */
export function CoffeeClubPanel() {
  const loyalty = useLoyalty();
  const cart = useOptionalCart();
  const [addedToCart, setAddedToCart] = useState(false);

  const isOpen = loyalty?.panelOpen ?? false;
  const progress = loyalty?.progress;

  useEffect(() => {
    if (isOpen) setAddedToCart(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

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
    const existing = cart.items.find((i) => i.type === "loyalty_reward");
    if (existing) { setAddedToCart(true); return; }
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loyalty]);

  if (!isOpen || !progress) return null;

  const target = progress.progress.target;
  const current = progress.progress.current % target;
  const stampsAway = progress.bonuses.stampsAway;
  const rewardReady = progress.reward.ready;
  const clubName = loyalty?.clubName || "Coffee Club";
  const rewardItem = loyalty?.rewardItem;
  const rewardInCart = cart?.items.some((i) => i.type === "loyalty_reward") ?? false;
  const streak = progress.streak;
  const inactivityBonus = progress.inactivityBonus;
  const secretReward = progress.secretReward;
  const secretDaysLeft = secretReward?.expiresAt
    ? Math.ceil((new Date(secretReward.expiresAt).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative z-10 mt-auto w-full max-w-[480px] mx-auto h-[92vh] bg-background rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5 space-y-6">

          {/* Stamp progress */}
          <StampTrack current={current} target={target} />

          {/* Progress caption */}
          <div className="text-center space-y-2">
            {rewardReady ? (
              <p className="text-lg font-bold text-amber-600">🎉 Ödülünüz Hazır!</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{stampsAway}</span> sipariş daha →{" "}
                <span className="font-bold text-primary">{rewardItem?.name || "ÜcretSiZ KAHVE"}</span>
              </p>
            )}
            {streak.active && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-200">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-700">{streak.count} günlük seri · {streak.bonusMultiplier}x puan</span>
              </div>
            )}
          </div>

          {/* P4 — Favorite item (social proof / personalization) */}
          {!rewardReady && progress.favoriteItem && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span>❤️</span>
              <span>En çok sipariş ettiğiniz:{" "}
                <strong className="text-foreground">{progress.favoriteItem.name}</strong>
              </span>
            </div>
          )}

          {/* Inactivity bonus card */}
          {inactivityBonus.active && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Geri Döndün Bonusu! ⚡</p>
                <p className="text-xs text-emerald-600">Bu siparişte {inactivityBonus.multiplier}x puan kazanırsın</p>
                {inactivityBonus.expiresAt && (
                  <p className="text-[10px] text-emerald-500 mt-0.5">{getExpiryText(inactivityBonus.expiresAt)}</p>
                )}
              </div>
            </div>
          )}

          {/* Secret reward card — P3: urgency escalates within 48h */}
          {secretReward?.won && (
            <div className={`border rounded-2xl p-4 space-y-2 ${
              secretDaysLeft !== null && secretDaysLeft <= 2
                ? "bg-red-50 border-red-200"
                : "bg-violet-50 border-violet-200"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${
                    secretDaysLeft !== null && secretDaysLeft <= 2 ? "text-red-800" : "text-violet-800"
                  }`}>Gizli Ödül Kazandın!</p>
                  <p className={`text-xs ${
                    secretDaysLeft !== null && secretDaysLeft <= 2 ? "text-red-600" : "text-violet-600"
                  }`}>%{secretReward.discountPercent} indirim · siparişinde otomatik uygulanır</p>
                </div>
              </div>
              {secretReward.expiresAt && (
                <p className={`text-[10px] font-medium ${
                  secretDaysLeft !== null && secretDaysLeft <= 1
                    ? "text-red-600 font-bold"
                    : secretDaysLeft !== null && secretDaysLeft <= 2
                      ? "text-red-500"
                      : "text-violet-400"
                }`}>
                  {secretDaysLeft !== null && secretDaysLeft <= 1 ? "⚠️ Son gün! " : secretDaysLeft !== null && secretDaysLeft <= 2 ? "⏰ " : ""}
                  {getExpiryText(secretReward.expiresAt)}
                </p>
              )}
            </div>
          )}

          {/* Reward ready card */}
          {rewardReady && rewardItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-700">Ödülünüz Hazır!</h3>
              </div>
              <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-amber-100 shadow-sm">
                {rewardItem.image ? (
                  <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image src={rewardItem.image} alt={rewardItem.name} fill sizes="64px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 shrink-0 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Gift className="w-7 h-7 text-amber-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{rewardItem.name}</p>
                  <p className="text-sm text-green-600 font-semibold">ÜCRETSiZ</p>
                </div>
              </div>
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
              {progress.reward.expiresAt && (
                <p className="text-xs text-amber-500 text-center">
                  {getExpiryText(progress.reward.expiresAt)}
                </p>
              )}
            </div>
          )}

          {/* Push notification opt-in */}
          {loyalty?.pushStatus === "idle" && (
            <button
              type="button"
              onClick={() => loyalty?.triggerPushSheet("manual")}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/60 transition-colors text-left active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Sipariş ve ödül bildirimleri</p>
                <p className="text-xs text-muted-foreground">Hazır olduğunda seni haberdar edelim</p>
              </div>
            </button>
          )}
          {loyalty?.pushStatus === "granted" && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border">
              <Bell className="w-4 h-4 text-foreground shrink-0" />
              <p className="text-xs text-muted-foreground font-medium">✓ Bildirimler açık</p>
            </div>
          )}
        </div>

        {/* Sticky footer */}
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

/* ─── Stamp Track ─── */
function StampTrack({ current, target }: { current: number; target: number }) {
  const useVisualStamps = target <= 12;

  if (!useVisualStamps) {
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{current} / {target}</p>
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
              filled ? "bg-primary/10 scale-100" : "bg-muted scale-90 opacity-50"
            }`}
          >
            {filled ? "☕" : "○"}
          </div>
        );
      })}
    </div>
  );
}

function getExpiryText(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi dolmuş";
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return "Son gün! ⏰";
  return `${days} gün kaldı ⏰`;
}
