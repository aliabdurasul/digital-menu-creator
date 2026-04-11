"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, Gift, Sparkles, Flame, ShoppingCart, Check } from "lucide-react";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import { useCart } from "@/components/menu/CartProvider";
import { cn } from "@/lib/utils";

interface CoffeeClubPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen loyalty panel — the "Coffee Club" mini-app.
 *
 * Sections:
 *   1. Header with club name + close
 *   2. Stamp progress track (☕ × current, ⚪ × remaining)
 *   3. Reward card (when reward.ready) with "Add to Cart" CTA
 *   4. Active bonuses (happy hour, near-completion)
 *   5. "Order Now" footer CTA
 *
 * State is entirely driven by LoyaltyProvider context — no local fetching.
 */
export function CoffeeClubPanel({ open, onClose }: CoffeeClubPanelProps) {
  const loyalty = useLoyalty();
  const cart = useCartSafe();
  const [rewardAdded, setRewardAdded] = useState(false);

  // Lock body scroll when panel open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Reset "Added" state when panel re-opens
  useEffect(() => {
    if (open) setRewardAdded(false);
  }, [open]);

  if (!open) return null;

  const hasProgress = loyalty && !loyalty.isLoading && loyalty.progress;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-slide-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>☕</span>
          <h2 className="font-bold text-lg text-foreground">
            {loyalty?.progress?.clubName ?? "Coffee Club"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        {!hasProgress ? (
          <EmptyState loading={loyalty?.isLoading} />
        ) : (
          <PanelContent
            loyalty={loyalty.progress!}
            cart={cart}
            rewardAdded={rewardAdded}
            onRewardAdded={() => {
              setRewardAdded(true);
            }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Main panel content ─── */

function PanelContent({
  loyalty,
  cart,
  rewardAdded,
  onRewardAdded,
  onClose,
}: {
  loyalty: NonNullable<ReturnType<typeof useLoyalty>>["progress"] & object;
  cart: ReturnType<typeof useCartSafe>;
  rewardAdded: boolean;
  onRewardAdded: () => void;
  onClose: () => void;
}) {
  if (!loyalty) return null;

  const { progress, reward, bonuses, clubName, rewardItemName, rewardItemImage } = loyalty;
  const progressInCycle = progress.target > 0
    ? progress.current % progress.target
    : 0;
  const fillPercent = progress.target > 0
    ? Math.min(100, Math.round((progressInCycle / progress.target) * 100))
    : 0;
  const stampsRemaining = Math.max(0, progress.target - progressInCycle);
  const rewardDisplayName = rewardItemName || "Ücretsiz Ödül";

  function handleAddReward() {
    if (!cart || rewardAdded) return;
    // Only allow one loyalty reward in the cart
    const alreadyInCart = cart.items.some((i) => i.type === "loyalty_reward");
    if (alreadyInCart) {
      onRewardAdded();
      return;
    }
    cart.addItem({
      menuItemId: `loyalty_reward_${Date.now()}`,
      name: rewardDisplayName,
      price: 0,
      image: rewardItemImage ?? "",
      type: "loyalty_reward",
    });
    onRewardAdded();
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-[480px] mx-auto w-full">
      {/* ── Reward Ready Section ── */}
      {reward.ready && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-amber-600 animate-bounce" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-base">🎉 Ödülünüz Hazır!</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {reward.message ?? rewardDisplayName}
              </p>
              {reward.expiresAt && (
                <p className="text-xs text-amber-500 mt-0.5">
                  {getExpiryText(reward.expiresAt)}
                </p>
              )}
            </div>
          </div>

          {/* Reward item display */}
          {(rewardItemImage || rewardItemName) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-amber-200 mb-4">
              {rewardItemImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rewardItemImage}
                  alt={rewardDisplayName}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{rewardDisplayName}</p>
                <p className="text-xs text-amber-600 font-bold mt-0.5">ÜCRETSİZ</p>
              </div>
            </div>
          )}

          {/* Add to Cart CTA */}
          <button
            type="button"
            onClick={handleAddReward}
            disabled={!cart || rewardAdded}
            className={cn(
              "w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200",
              rewardAdded
                ? "bg-green-500 text-white cursor-default"
                : cart
                  ? "bg-amber-500 hover:bg-amber-600 text-white active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {rewardAdded ? (
              <>
                <Check className="w-4 h-4" />
                Sepete Eklendi
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Sepete Ekle
              </>
            )}
          </button>

          {!cart && (
            <p className="text-xs text-center text-amber-600 mt-2">
              Ödülü kullanmak için masanızın QR kodunu tarayın
            </p>
          )}
        </div>
      )}

      {/* ── Stamp Progress ── */}
      <div className="space-y-3">
        <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          İlerlemeniz
        </p>

        {/* Stamp track */}
        <StampTrack
          current={progressInCycle}
          target={progress.target}
        />

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              reward.ready
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : bonuses.nearCompletion
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-primary"
            )}
            style={{ width: `${reward.ready ? 100 : fillPercent}%` }}
          />
        </div>

        {/* Progress numbers */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">
            {reward.ready ? (
              <span className="text-amber-600">✓ Tamamlandı!</span>
            ) : (
              `${progressInCycle} / ${progress.target}`
            )}
          </span>
          {!reward.ready && (
            <span className="text-muted-foreground">
              {stampsRemaining} sipariş kaldı
            </span>
          )}
        </div>

        {/* Reward goal text */}
        {!reward.ready && (
          <p className="text-sm text-center text-muted-foreground bg-muted/50 rounded-xl px-4 py-2.5">
            {stampsRemaining === 1
              ? `🎁 Sadece 1 sipariş daha → ${rewardDisplayName}!`
              : `${stampsRemaining} sipariş sonra → ${rewardDisplayName} 🎁`}
          </p>
        )}
      </div>

      {/* ── Bonuses ── */}
      {(bonuses.happyHour || bonuses.nearCompletion) && !reward.ready && (
        <div className="space-y-2">
          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Aktif Bonuslar
          </p>

          {bonuses.happyHour && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-50 border border-purple-200">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-purple-800">
                  {bonuses.multiplier}x Puan Aktif!
                </p>
                <p className="text-xs text-purple-600">
                  Happy Hour — şu an normal 2 kat puan kazanıyorsunuz
                </p>
              </div>
            </div>
          )}

          {bonuses.nearCompletion && bonuses.stampsAway > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-50 border border-orange-200">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-orange-800">
                  Neredeyse Orada!
                </p>
                <p className="text-xs text-orange-600">
                  🔥 Sadece {bonuses.stampsAway} sipariş kaldı — {rewardDisplayName} sizi bekliyor!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── How it works ── */}
      {!reward.ready && (
        <div className="pt-2 pb-1">
          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Nasıl Çalışır?
          </p>
          <div className="space-y-2.5">
            {[
              { icon: "☕", text: "Her siparişinizde 1 puan kazanırsınız" },
              { icon: "🎁", text: `${progress.target} siparişte ${rewardDisplayName} kazanırsınız` },
              { icon: "🚀", text: "Puanlarınız cihazınıza bağlı, kayıt gerekmez" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center shrink-0">{step.icon}</span>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stamp track ─── */

function StampTrack({ current, target }: { current: number; target: number }) {
  const max = Math.min(target, 12); // Max visible on mobile
  const slots = Array.from({ length: max }, (_, i) => i < current);

  return (
    <div className="flex flex-wrap gap-1.5 justify-center py-1">
      {slots.map((filled, i) => (
        <div
          key={i}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-300",
            filled
              ? "bg-amber-100 shadow-sm scale-105"
              : "bg-muted border border-border"
          )}
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          {filled ? "☕" : "⚪"}
        </div>
      ))}
      {target > max && (
        <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground font-bold">
          +{target - max}
        </div>
      )}
    </div>
  );
}

/* ─── Empty / loading state ─── */

function EmptyState({ loading }: { loading?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center gap-4">
      <span className="text-5xl">☕</span>
      {loading ? (
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      ) : (
        <>
          <p className="font-semibold text-foreground">Sadakat programı aktif değil</p>
          <p className="text-muted-foreground text-sm">
            Bu mekan henüz bir sadakat programı kurmamış.
          </p>
        </>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function getExpiryText(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi dolmuş";
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return "Son gün! ⏰";
  return `${days} gün içinde sona eriyor ⏰`;
}

/** Gracefully consume useCart — returns null when outside CartProvider */
function useCartSafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCart();
  } catch {
    return null;
  }
}
