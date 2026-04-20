"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Gift,
  ShoppingBag,
  ChevronDown,
  Bell,
  Flame,
  Zap,
  Smartphone,
  BellOff,
  Heart,
  Clock,
  Trophy,
  ChevronRight,
  Star,
  Store,
  Check,
  X,
} from "lucide-react";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import { useCart } from "@/components/menu/CartProvider";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallPromptSheet } from "@/components/loyalty/InstallPromptSheet";
import { ReferralCard } from "@/components/loyalty/ReferralCard";
import { useToast } from "@/hooks/use-toast";
import type { RewardPoolItem } from "@/types";

function useOptionalCart() {
  try {
    return useCart();
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────── */
/*  CoffeeClubPanel — gamified app-like loyalty experience     */
/* ──────────────────────────────────────────────────────────── */

interface CoffeeClubPanelProps {
  onOpenCart?: () => void;
}

export function CoffeeClubPanel({ onOpenCart }: CoffeeClubPanelProps) {
  const loyalty = useLoyalty();
  const cart = useOptionalCart();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"home" | "rewards" | "store" | "settings">("home");
  const [selectedRewardItem, setSelectedRewardItem] = useState<RewardPoolItem | null>(null);
  const [rewardAdded, setRewardAdded] = useState(false);
  // Confirmation dialog for point store
  const [confirmItem, setConfirmItem] = useState<{ id: string; name: string; cost_points: number } | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());

  const isOpen = loyalty?.panelOpen ?? false;
  const progress = loyalty?.progress;

  useEffect(() => {
    if (isOpen) {
      setActiveTab("home");
      setSelectedRewardItem(null);
      setRewardAdded(false);
      setConfirmItem(null);
    }
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

  const handleClose = useCallback(() => loyalty?.setPanelOpen(false), [loyalty]);

  /** Add a stamp reward item to cart, show toast, close panel, open cart */
  const handleAddReward = useCallback((overrideItem?: RewardPoolItem) => {
    const rewardPool = loyalty?.rewardPool ?? [];
    const rewardItem = loyalty?.rewardItem;
    const rewardType = loyalty?.progress?.reward?.type;
    const rewardValue = loyalty?.progress?.reward?.value;

    // Discount rewards — no item added to cart, just notify and navigate
    if (rewardType === "discount_percent" || rewardType === "discount_amount") {
      setRewardAdded(true);
      const label = rewardType === "discount_percent" ? `%${rewardValue} indirim` : `₺${rewardValue} indirim`;
      toast({
        title: "🎁 İndirim Aktif!",
        description: `${label} siparişine uygulanacak. Siparişini tamamla!`,
      });
      setTimeout(() => {
        loyalty?.setPanelOpen(false);
        onOpenCart?.();
      }, 300);
      return;
    }

    if (!cart) return;
    const itemToUse = overrideItem ?? (rewardPool.length === 1 ? rewardPool[0] : null) ?? (rewardItem
      ? { menuItemId: rewardItem.menuItemId, name: rewardItem.name, image: rewardItem.image }
      : null);
    if (!itemToUse) return;

    const existing = cart.items.find((i) => i.type === "loyalty_reward");
    if (!existing) {
      const rewardLineId = `loyalty_reward_${Date.now()}`;
      cart.addItem({
        lineId: rewardLineId,
        menuItemId: itemToUse.menuItemId || rewardLineId,
        name: itemToUse.name,
        price: 0,
        image: itemToUse.image || "",
        type: "loyalty_reward",
      });
    }

    setRewardAdded(true);
    toast({
      title: "🎁 Ödül Sepete Eklendi!",
      description: `${itemToUse.name} ücretsiz olarak sepetine eklendi. Siparişini tamamla!`,
    });
    // Close panel and open cart
    setTimeout(() => {
      loyalty?.setPanelOpen(false);
      onOpenCart?.();
    }, 300);
  }, [cart, loyalty, toast, onOpenCart]);

  const handleOrderNow = useCallback(() => {
    if (cart && loyalty?.progress?.favoriteItem) {
      const fav = loyalty.progress.favoriteItem;
      if (fav.menuItemId) {
        cart.addItem({
          lineId: fav.menuItemId,
          menuItemId: fav.menuItemId,
          name: fav.name,
          price: fav.price ?? 0,
          image: fav.image || "",
        });
        toast({ title: "🛒 Sepete Eklendi", description: `${fav.name} sepetine eklendi!` });
      }
    }
    loyalty?.setPanelOpen(false);
    onOpenCart?.();
  }, [loyalty, cart, toast, onOpenCart]);

  if (!isOpen || !progress) return null;

  const target = progress.progress.target;
  const current = progress.progress.current % target;
  const stampsAway = progress.bonuses.stampsAway;
  const rewardReady = progress.reward.ready;
  const pendingCount = progress.reward.pendingCount ?? (rewardReady ? 1 : 0);
  const clubName = loyalty?.clubName || "Coffee Club";
  const rewardItem = loyalty?.rewardItem;
  const rewardPool = loyalty?.rewardPool ?? [];
  const rewardInCart = cart?.items.some((i) => i.type === "loyalty_reward") ?? false;
  const streak = progress.streak;
  const inactivityBonus = progress.inactivityBonus;
  const secretReward = progress.secretReward;
  const secretDaysLeft = secretReward?.expiresAt
    ? Math.ceil((new Date(secretReward.expiresAt).getTime() - Date.now()) / 86400000)
    : null;
  const pointsBalance = progress.points?.balance ?? 0;
  const hasPoints = !!progress.points;
  const rId = loyalty?.restaurantId ?? "";
  const cKey = loyalty?.customerKey ?? "";

  const activeBoosterCount =
    (progress.bonuses.happyHour ? 1 : 0) +
    (streak.active ? 1 : 0) +
    (inactivityBonus.active ? 1 : 0);

  const rewardLabel =
    progress.reward.type === "free_item"
      ? `Ücretsiz ${rewardItem?.name || "Kahve"}`
      : progress.reward.type === "discount_percent"
        ? `%${progress.reward.value} İndirim`
        : `₺${progress.reward.value} İndirim`;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative z-10 mt-auto w-full max-w-[480px] mx-auto h-[92vh] bg-[#F8F6F3] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-[#F8F6F3]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">☕</span>
            <h2 className="text-lg font-bold text-[#3D2C1E]">{clubName}</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasPoints && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C89B3C]/10 border border-[#C89B3C]/20">
                <Star className="w-3 h-3 text-[#C89B3C] fill-[#C89B3C]" />
                <span className="text-xs font-bold text-[#C89B3C]">{pointsBalance}</span>
              </div>
            )}
            {streak.active && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 border border-orange-200">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-orange-700">{streak.count}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
            >
              <ChevronDown className="w-5 h-5 text-[#6B4226]/60" />
            </button>
          </div>
        </div>

        {/* ─── Tab bar ─── */}
        <div className="flex mx-5 mb-4 bg-white/60 rounded-xl p-1 gap-1">
          <button type="button" onClick={() => setActiveTab("home")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "home" ? "bg-white text-[#6B4226] shadow-sm" : "text-[#6B4226]/50 hover:text-[#6B4226]/70"}`}>
            Kulübüm
          </button>
          {/* Ödüllerim tab — always visible, badge shows count */}
          <button type="button" onClick={() => setActiveTab("rewards")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative flex items-center justify-center gap-1 ${activeTab === "rewards" ? "bg-white text-[#6B4226] shadow-sm" : "text-[#6B4226]/50 hover:text-[#6B4226]/70"}`}>
            <Gift className="w-3.5 h-3.5" />
            Ödüllerim
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C89B3C] text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          {progress.points && (
            <button type="button" onClick={() => setActiveTab("store")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === "store" ? "bg-white text-[#6B4226] shadow-sm" : "text-[#6B4226]/50 hover:text-[#6B4226]/70"}`}>
              <Store className="w-3.5 h-3.5" />
              Mağaza
            </button>
          )}
          <button type="button" onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "settings" ? "bg-white text-[#6B4226] shadow-sm" : "text-[#6B4226]/50 hover:text-[#6B4226]/70"}`}>
            Ayarlar
          </button>
        </div>

        {/* ─── Scrollable content ─── */}
        <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-5">

          {activeTab === "home" ? (
            <>
              {/* ═══ HERO CARD ═══ */}
              <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#6B4226] via-[#4A2E18] to-[#2C1A0E] p-5 shadow-lg">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#C89B3C]/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-[#C89B3C]/10 blur-xl" />
                <div className="relative space-y-3">
                  {streak.active && (
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-orange-300">{streak.count} Günlük Seri</span>
                      <span className="ml-auto text-[10px] text-white/40 font-medium">{streak.bonusMultiplier}x puan</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-white/90">🎯</span>
                    <p className="text-sm text-white/90">
                      {rewardReady ? (
                        <span className="font-bold text-[#C89B3C]">🔓 Ödül Kilidi Açıldı!</span>
                      ) : (
                        <>
                          <span className="font-bold text-white">{stampsAway} sipariş</span>
                          <span className="text-white/60"> kaldı → </span>
                          <span className="font-bold text-[#C89B3C]">{rewardLabel}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {(progress.bonuses.happyHour || inactivityBonus.active) && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/90">⏳</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {progress.bonuses.happyHour && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C89B3C]/20 text-[#C89B3C] text-[11px] font-bold">
                            ⚡ {progress.bonuses.multiplier}x puan
                          </span>
                        )}
                        {inactivityBonus.active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] font-bold">
                            👋 {inactivityBonus.multiplier}x geri dönüş
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ REWARD READY CTA BANNER (opens Ödüllerim tab) ═══ */}
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("rewards")}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-[#C89B3C] shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#C89B3C]/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-[#C89B3C]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-[#6B4226]">
                      🔓 {pendingCount} Ödülün Var!
                    </p>
                    <p className="text-xs text-[#6B4226]/60">
                      {rewardInCart ? "Ödül sepetinde" : "Hemen kullan → sepete ekle"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#C89B3C] shrink-0" />
                </button>
              )}

              {/* ═══ STAMP PROGRESS ═══ */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <StampTrack current={current} target={target} rewardReady={rewardReady} />
                <div className="text-center mt-3">
                  {rewardReady ? (
                    <p className="text-sm font-bold text-[#C89B3C]">🔓 Ödülünü "Ödüllerim" sekmesinden kullanabilirsin!</p>
                  ) : (
                    <p className="text-xs text-[#6B4226]/50">
                      <span className="font-bold text-[#6B4226]">{stampsAway}</span> sipariş sonra →{" "}
                      <span className="font-bold text-[#6B4226]">{rewardLabel}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* ═══ ACTIVE BOOSTERS ═══ */}
              {activeBoosterCount > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-[#6B4226]/60 uppercase tracking-wider px-1">Aktif Bonuslar</h3>
                  {progress.bonuses.happyHour && (
                    <div className="flex items-center gap-3 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">{progress.bonuses.multiplier}x Puan</p>
                        <p className="text-xs text-amber-600/70">Happy hour aktif</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                        <Clock className="w-3.5 h-3.5" /><span>Aktif</span>
                      </div>
                    </div>
                  )}
                  {streak.active && (
                    <div className="flex items-center gap-3 bg-orange-50 rounded-2xl p-4 border border-orange-100">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-orange-800">{streak.count} Günlük Seri 🔥</p>
                        <p className="text-xs text-orange-600/70">{streak.bonusMultiplier}x bonus puan kazanıyorsun</p>
                      </div>
                    </div>
                  )}
                  {inactivityBonus.active && (
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-800">Geri Dönüş Bonusu ⚡</p>
                        <p className="text-xs text-emerald-600/70">{inactivityBonus.multiplier}x puan kazanırsın</p>
                      </div>
                      {inactivityBonus.expiresAt && (
                        <p className="text-[10px] text-emerald-500 font-medium shrink-0">{getExpiryText(inactivityBonus.expiresAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ FAVORITE PRODUCT CARD ═══ */}
              {!rewardReady && progress.favoriteItem && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    {progress.favoriteItem.image ? (
                      <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#F8F6F3]">
                        <Image src={progress.favoriteItem.image} alt={progress.favoriteItem.name} fill sizes="64px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-xl bg-[#F8F6F3] flex items-center justify-center">
                        <Heart className="w-6 h-6 text-[#6B4226]/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                        <span className="text-[11px] font-medium text-[#6B4226]/50">Favori</span>
                      </div>
                      <p className="text-sm font-bold text-[#3D2C1E] truncate">{progress.favoriteItem.name}</p>
                      {(streak.active || progress.bonuses.happyHour) && (
                        <p className="text-[11px] text-[#C89B3C] font-medium mt-0.5">
                          🔥 Bugün sipariş ver → {progress.bonuses.multiplier > 1 ? `${progress.bonuses.multiplier}x` : streak.active ? `${streak.bonusMultiplier}x` : ""} puan kazan
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={handleOrderNow}
                      className="shrink-0 px-3.5 py-2 rounded-xl bg-[#6B4226] text-white text-xs font-semibold hover:bg-[#5A3720] active:scale-95 transition-all shadow-sm">
                      Sipariş
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ SECRET REWARD ═══ */}
              {secretReward?.won && (
                <div className={`rounded-2xl p-4 space-y-2 border ${secretDaysLeft !== null && secretDaysLeft <= 2 ? "bg-red-50 border-red-200" : "bg-violet-50 border-violet-200"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                      <span className="text-xl">🎁</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${secretDaysLeft !== null && secretDaysLeft <= 2 ? "text-red-800" : "text-violet-800"}`}>Gizli Ödül Kazandın!</p>
                      <p className={`text-xs ${secretDaysLeft !== null && secretDaysLeft <= 2 ? "text-red-600" : "text-violet-600"}`}>%{secretReward.discountPercent} indirim · otomatik uygulanır</p>
                    </div>
                  </div>
                  {secretReward.expiresAt && (
                    <p className={`text-[10px] font-medium ${secretDaysLeft !== null && secretDaysLeft <= 1 ? "text-red-600 font-bold" : secretDaysLeft !== null && secretDaysLeft <= 2 ? "text-red-500" : "text-violet-400"}`}>
                      {secretDaysLeft !== null && secretDaysLeft <= 1 ? "⚠️ Son gün! " : secretDaysLeft !== null && secretDaysLeft <= 2 ? "⏰ " : ""}
                      {getExpiryText(secretReward.expiresAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Locked reward preview (only when no pending rewards) */}
              {!rewardReady && rewardItem && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {rewardItem.image ? (
                        <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-[#F8F6F3] opacity-60">
                          <Image src={rewardItem.image} alt={rewardItem.name} fill sizes="56px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 shrink-0 rounded-xl bg-[#F8F6F3] flex items-center justify-center">
                          <Gift className="w-6 h-6 text-[#6B4226]/25" />
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#6B4226]/10 flex items-center justify-center">
                        <span className="text-[10px]">🔒</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#6B4226]/40 font-medium">🎁 Sonraki ödül</p>
                      <p className="text-sm font-bold text-[#3D2C1E]">{rewardLabel}</p>
                      <p className="text-xs text-[#6B4226]/50 mt-0.5">{stampsAway} sipariş kaldı</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ UPSELL MESSAGE ═══ */}
              {progress.upsell && (
                <div className="text-center px-4">
                  <p className="text-xs text-[#6B4226]/40 italic">{progress.upsell.message}</p>
                </div>
              )}

              {/* ═══ REFERRAL CARD ═══ */}
              {rId && <ReferralCard restaurantId={rId} />}
            </>
          ) : activeTab === "rewards" ? (
            /* ═══ ÖDÜLLERIM TAB ═══ */
            <RewardsTab
              pendingCount={pendingCount}
              rewardLabel={rewardLabel}
              rewardItem={rewardItem}
              rewardPool={rewardPool}
              rewardInCart={rewardInCart}
              rewardAdded={rewardAdded}
              expiresAt={progress.reward.expiresAt}
              selectedRewardItem={selectedRewardItem}
              onSelectItem={setSelectedRewardItem}
              onAddReward={handleAddReward}
              rewardType={progress.reward.type}
              rewardValue={progress.reward.value}
            />
          ) : activeTab === "store" ? (
            /* ═══ MAĞAZA TAB ═══ */
            <StoreTab
              restaurantId={rId}
              balance={pointsBalance}
              history={progress.points?.history ?? []}
              onRequestRedeem={(item) => setConfirmItem(item)}
              redeeming={redeeming}
              redeemed={redeemed}
            />
          ) : (
            /* ═══ AYARLAR TAB ═══ */
            <SettingsTab />
          )}
        </div>

        {/* ─── Sticky footer CTA ─── */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#F8F6F3] via-[#F8F6F3] to-transparent px-5 pt-6 pb-5">
          <button
            type="button"
            onClick={handleOrderNow}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#6B4226] text-white text-sm font-bold hover:bg-[#5A3720] transition-all active:scale-[0.98] shadow-lg shadow-[#6B4226]/20"
          >
            <ShoppingBag className="w-4 h-4" />
            Sipariş Ver
            {stampsAway > 0 && !rewardReady && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">
                +{progress.bonuses.multiplier > 1 ? progress.bonuses.multiplier : 1} puan
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Confirmation Dialog for store items ─── */}
      {confirmItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmItem(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C89B3C]/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-[#C89B3C]" />
                </div>
                <div>
                  <p className="font-bold text-[#3D2C1E] text-sm">Ödülü Al</p>
                  <p className="text-xs text-[#6B4226]/60">{confirmItem.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setConfirmItem(null)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-[#F8F6F3] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#C89B3C]">{confirmItem.cost_points} puan</p>
              <p className="text-xs text-[#6B4226]/50 mt-1">bakiyenden düşülecek</p>
              <p className="text-xs text-[#6B4226]/40 mt-1">Kalan: {pointsBalance - confirmItem.cost_points} puan</p>
            </div>
            <p className="text-xs text-[#6B4226]/60 text-center">
              Ürün sepetine eklenecek ve siparişinle birlikte ücretsiz gelecek.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmItem(null)}
                className="flex-1 py-3 rounded-xl border border-[#E8E4DF] text-sm font-semibold text-[#6B4226]/60 hover:bg-[#F8F6F3] transition-colors">
                İptal
              </button>
              <button
                type="button"
                disabled={redeeming === confirmItem.id}
                onClick={async () => {
                  const item = confirmItem;
                  setRedeeming(item.id);
                  setConfirmItem(null);
                  try {
                    const res = await fetch("/api/loyalty/store/redeem", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ customerKey: cKey, restaurantId: rId, storeItemId: item.id }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setRedeemed((prev) => new Set(prev).add(item.id));
                      if (cart) {
                        const lineId = `store_reward_${data.redemption?.id ?? Date.now()}`;
                        cart.addItem({
                          lineId,
                          menuItemId: data.item?.menu_item_id || lineId,
                          name: data.item?.name || item.name,
                          price: 0,
                          image: data.item?.image_url || "",
                          type: "point_store_reward",
                          redemptionId: data.redemption?.id,
                        });
                      }
                      loyalty?.refetch();
                      toast({
                        title: "🎁 Puan Ödülü Sepete Eklendi!",
                        description: `${item.name} ücretsiz olarak sepetine eklendi. Siparişini tamamla!`,
                      });
                      setTimeout(() => {
                        loyalty?.setPanelOpen(false);
                        onOpenCart?.();
                      }, 300);
                    } else {
                      toast({ title: "Hata", description: data.error || "İşlem başarısız", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Hata", description: "Bağlantı hatası", variant: "destructive" });
                  }
                  setRedeeming(null);
                }}
                className="flex-1 py-3 rounded-xl bg-[#C89B3C] text-white text-sm font-bold hover:bg-[#B8892F] active:scale-[0.98] transition-all shadow-sm disabled:opacity-60">
                {redeeming === confirmItem.id ? "..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Rewards Tab                                                  */
/* ──────────────────────────────────────────────────────────── */

interface RewardsTabProps {
  pendingCount: number;
  rewardLabel: string;
  rewardItem: { menuItemId?: string; name: string; image?: string } | null;
  rewardPool: RewardPoolItem[];
  rewardInCart: boolean;
  rewardAdded: boolean;
  expiresAt?: string | null;
  selectedRewardItem: RewardPoolItem | null;
  onSelectItem: (item: RewardPoolItem | null) => void;
  onAddReward: (item?: RewardPoolItem) => void;
  rewardType?: string;
  rewardValue?: number;
}

function RewardsTab({
  pendingCount,
  rewardLabel,
  rewardItem,
  rewardPool,
  rewardInCart,
  rewardAdded,
  expiresAt,
  selectedRewardItem,
  onSelectItem,
  onAddReward,
  rewardType,
}: RewardsTabProps) {
  const done = rewardInCart || rewardAdded;

  if (pendingCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#6B4226]/5 flex items-center justify-center">
          <Gift className="w-8 h-8 text-[#6B4226]/25" />
        </div>
        <p className="text-base font-bold text-[#3D2C1E]">Henüz ödülün yok</p>
        <p className="text-sm text-[#6B4226]/50">
          Stamp kartını doldur, ücretsiz ödül kazan!
        </p>
      </div>
    );
  }

  const isDiscountReward = rewardType === "discount_percent" || rewardType === "discount_amount";

  return (
    <div className="space-y-4">
      {/* Count badge */}
      <div className="flex items-center gap-2 px-1">
        <Trophy className="w-4 h-4 text-[#C89B3C]" />
        <p className="text-sm font-bold text-[#6B4226]">
          {pendingCount} adet kullanılmamış ödülün var
        </p>
      </div>

      {/* Expiry notice */}
      {expiresAt && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">{getExpiryText(expiresAt)}</p>
        </div>
      )}

      {/* Reward card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#C89B3C]" />
          <h3 className="font-bold text-[#6B4226]">🎁 {rewardLabel}</h3>
        </div>

        {/* Discount reward — no item to pick, applies to order total */}
        {isDiscountReward ? (
          <div className="bg-white rounded-xl p-4 border border-amber-100 text-center">
            <p className="text-2xl font-bold text-[#C89B3C]">{rewardLabel}</p>
            <p className="text-xs text-[#6B4226]/50 mt-1">Sepetindeki siparişe uygulanacak</p>
          </div>
        ) : rewardItem ? (
          /* Free item reward */
          <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-amber-100 shadow-sm">
            {rewardItem.image ? (
              <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#F8F6F3]">
                <Image src={rewardItem.image} alt={rewardItem.name} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 shrink-0 rounded-xl bg-amber-100 flex items-center justify-center">
                <Gift className="w-7 h-7 text-[#C89B3C]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#3D2C1E]">{rewardItem.name}</p>
              <p className="text-sm text-[#4CAF50] font-bold">ÜCRETSİZ 🎉</p>
            </div>
          </div>
        ) : null}

        {/* Pool selection */}
        {!isDiscountReward && rewardPool.length > 1 && !done && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#6B4226]/60 uppercase tracking-wide">Hangisini istersin?</p>
            <div className="grid grid-cols-2 gap-2">
              {rewardPool.map((item) => {
                const isSelected = selectedRewardItem?.menuItemId === item.menuItemId;
                return (
                  <button
                    key={item.menuItemId}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected ? "border-[#C89B3C] bg-[#C89B3C]/10" : "border-[#E8E4DF] bg-white hover:border-[#C89B3C]/50"
                    }`}
                  >
                    {item.image && (
                      <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden bg-[#F8F6F3]">
                        <Image src={item.image} alt={item.name} fill sizes="32px" className="object-cover" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-[#3D2C1E] line-clamp-2">{item.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#C89B3C] shrink-0 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          type="button"
          onClick={() => {
            if (!isDiscountReward) {
              onAddReward(selectedRewardItem ?? (rewardPool.length === 1 ? rewardPool[0] : undefined));
            } else {
              // For discount rewards, just close panel — discount is applied server-side at order time
              onAddReward();
            }
          }}
          disabled={done || (!isDiscountReward && rewardPool.length > 1 && !selectedRewardItem)}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            done
              ? "bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20"
              : !isDiscountReward && rewardPool.length > 1 && !selectedRewardItem
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[#C89B3C] text-white hover:bg-[#B8892F] active:scale-[0.98] shadow-md"
          }`}
        >
          {done ? (
            <>✓ {isDiscountReward ? "İndirim Aktif" : "Sepete Eklendi"}</>
          ) : (
            <>
              <Gift className="w-4 h-4" />
              {!isDiscountReward && rewardPool.length > 1 && !selectedRewardItem
                ? "Ödül Seçin"
                : isDiscountReward
                  ? "İndirimi Kullan → Sipariş Ver"
                  : "Sepete Ekle"}
            </>
          )}
        </button>

        <p className="text-xs text-[#6B4226]/40 text-center">
          Ödülün sepete eklenir, stamp toplamaya devam edersin ☕
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Store Tab (inline — shows point store items)                */
/* ──────────────────────────────────────────────────────────── */

type StoreItem = { id: string; name: string; description: string; cost_points: number; stock: number; image_url: string; menu_item_id?: string | null };

interface StoreTabProps {
  restaurantId: string;
  balance: number;
  history: Array<{ id: string; action_type: string; points: number }>;
  onRequestRedeem: (item: StoreItem) => void;
  redeeming: string | null;
  redeemed: Set<string>;
}

function StoreTab({ restaurantId, balance, history, onRequestRedeem, redeeming, redeemed }: StoreTabProps) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    fetch(`/api/loyalty/store?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#6B4226]/20 border-t-[#6B4226] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance header */}
      <div className="bg-gradient-to-br from-[#C89B3C]/10 to-[#6B4226]/5 rounded-2xl p-4 border border-[#C89B3C]/15 text-center">
        <p className="text-xs text-[#6B4226]/50 mb-1">Mevcut Puanın</p>
        <div className="flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-[#C89B3C] fill-[#C89B3C]" />
          <span className="text-3xl font-bold text-[#C89B3C]">{balance}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Gift className="w-10 h-10 text-[#6B4226]/15 mx-auto" />
          <p className="text-sm text-[#6B4226]/40">Yakında ödüller eklenecek!</p>
        </div>
      ) : (
        items.map((item) => {
          const canAfford = balance >= item.cost_points;
          const outOfStock = item.stock !== -1 && item.stock <= 0;
          const justRedeemed = redeemed.has(item.id);

          return (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-br from-[#C89B3C]/10 to-[#6B4226]/10 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-[#C89B3C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3D2C1E] truncate">{item.name}</p>
                  {item.description && <p className="text-xs text-[#6B4226]/50 truncate">{item.description}</p>}
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-[#C89B3C] fill-[#C89B3C]" />
                    <span className="text-xs font-bold text-[#C89B3C]">{item.cost_points} puan</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canAfford || outOfStock || !!redeeming || justRedeemed}
                  onClick={() => onRequestRedeem(item)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    justRedeemed
                      ? "bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20"
                      : canAfford && !outOfStock
                        ? "bg-[#C89B3C] text-white hover:bg-[#B8892F] active:scale-95 shadow-sm"
                        : "bg-[#E8E4DF] text-[#6B4226]/30 cursor-not-allowed"
                  }`}
                >
                  {redeeming === item.id ? "..." : justRedeemed ? "✓ Alındı" : outOfStock ? "Tükendi" : "Al"}
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Points history */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[#6B4226]/60 uppercase tracking-wider mb-3">Son İşlemler</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-[#E8E4DF] last:border-0">
                <span className="text-xs text-[#6B4226]/70">{actionLabel(h.action_type)}</span>
                <span className="text-xs font-bold text-[#4CAF50]">+{h.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function actionLabel(type: string): string {
  const labels: Record<string, string> = {
    pwa_install: "Uygulama yükleme",
    social_share: "Sosyal paylaşım",
    review: "Yorum bırakma",
    referral_bonus: "Arkadaş daveti",
    referee_bonus: "Davet bonusu",
    order_bonus: "Sipariş puanı",
  };
  return labels[type] || type;
}

/* ──────────────────────────────────────────────────────────── */
/*  Settings Tab                                                */
/* ──────────────────────────────────────────────────────────── */

function SettingsTab() {
  const loyalty = useLoyalty();
  const pushStatus = loyalty?.pushStatus ?? "idle";

  return (
    <div className="space-y-5">
      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-xs font-bold text-[#6B4226]/60 uppercase tracking-wider px-4 pt-4 pb-2">Bildirimler</h3>

        {pushStatus === "idle" && (
          <button
            type="button"
            onClick={() => loyalty?.triggerPushSheet("manual")}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F8F6F3] transition-colors text-left active:scale-[0.99]"
          >
            <div className="w-9 h-9 rounded-xl bg-[#6B4226]/5 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[#6B4226]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3D2C1E]">Bildirimleri Aç</p>
              <p className="text-xs text-[#6B4226]/50">Sipariş ve ödül güncellemeleri</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6B4226]/30 shrink-0" />
          </button>
        )}

        {pushStatus === "granted" && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#4CAF50]/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[#4CAF50]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3D2C1E]">Bildirimler Açık</p>
              <p className="text-xs text-[#4CAF50]">Sipariş ve ödül bildirimleri alıyorsun</p>
            </div>
            <span className="text-xs font-medium text-[#4CAF50]">✓</span>
          </div>
        )}

        {pushStatus === "denied" && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF4D4F]/10 flex items-center justify-center shrink-0">
              <BellOff className="w-4 h-4 text-[#FF4D4F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3D2C1E]">Bildirimler Kapalı</p>
              <p className="text-xs text-[#6B4226]/50">Tarayıcı ayarlarından açabilirsiniz</p>
            </div>
          </div>
        )}
      </div>

      {/* App install */}
      <InstallSettingsCard />

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-xs font-bold text-[#6B4226]/60 uppercase tracking-wider px-4 pt-4 pb-2">Hakkında</h3>
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6B4226]/70">Sistem</span>
            <span className="text-sm font-medium text-[#3D2C1E]">Coffee Club v2</span>
          </div>
          <div className="h-px bg-[#E8E4DF]" />
          <p className="text-xs text-[#6B4226]/40 leading-relaxed">
            Her siparişte otomatik puan kazanırsın. Hedefe ulaştığında ödülünü buradan sepetine ekleyebilirsin. Seri bonusu, happy hour ve geri dönüş bonusları puanlarını katlar.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Install Settings Card ─── */
function InstallSettingsCard() {
  const loyalty = useLoyalty();
  const customerKey = loyalty?.customerKey ?? "";
  const restaurantId = loyalty?.restaurantId ?? "";

  const awardPwaPoints = useCallback(() => {
    if (!customerKey || !restaurantId) return;
    fetch("/api/loyalty/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerKey, restaurantId, actionType: "pwa_install" }),
    }).catch(() => {});
  }, [customerKey, restaurantId]);

  const { canInstall, isInstalled } = useInstallPrompt({ onInstalled: awardPwaPoints });
  const [installSheetOpen, setInstallSheetOpen] = useState(false);

  const needsManualIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    typeof window !== "undefined" &&
    !window.matchMedia("(display-mode: standalone)").matches &&
    !(window.navigator as { standalone?: boolean }).standalone;

  const showInstall = !isInstalled && (canInstall || needsManualIOS);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h3 className="text-xs font-bold text-[#6B4226]/60 uppercase tracking-wider px-4 pt-4 pb-2">Uygulama</h3>

      {isInstalled ? (
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#4CAF50]/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#3D2C1E]">Uygulama Yüklü</p>
            <p className="text-xs text-[#4CAF50]">Ana ekrandan erişebilirsin</p>
          </div>
          <span className="text-xs font-medium text-[#4CAF50]">✓</span>
        </div>
      ) : showInstall ? (
        <>
          <button
            type="button"
            onClick={() => setInstallSheetOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F8F6F3] transition-colors text-left active:scale-[0.99]"
          >
            <div className="w-9 h-9 rounded-xl bg-[#6B4226]/5 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-[#6B4226]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3D2C1E]">Uygulamayı Yükle</p>
              <p className="text-xs text-[#6B4226]/50">Ana ekrana ekle, daha hızlı eriş</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6B4226]/30 shrink-0" />
          </button>
          <InstallPromptSheet
            open={installSheetOpen}
            onClose={() => setInstallSheetOpen(false)}
            customerKey={customerKey}
            restaurantId={restaurantId}
          />
        </>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#6B4226]/5 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-[#6B4226]/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#3D2C1E]/60">Uygulama</p>
            <p className="text-xs text-[#6B4226]/40">Bu tarayıcıda yükleme desteklenmiyor</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Stamp Track                                                 */
/* ──────────────────────────────────────────────────────────── */

function StampTrack({ current, target, rewardReady }: { current: number; target: number; rewardReady: boolean }) {
  const useVisualStamps = target <= 12;

  if (!useVisualStamps) {
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#3D2C1E]">{current} / {target}</p>
          <p className="text-xs font-medium text-[#6B4226]/50">{percent}%</p>
        </div>
        <div className="h-3 rounded-full bg-[#E8E4DF] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6B4226] to-[#C89B3C] transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  // Visual stamp icons + reward at end
  const stamps = useMemo(() => Array.from({ length: target }, (_, i) => i), [target]);

  return (
    <div className="flex flex-wrap justify-center items-center gap-2">
      {stamps.map((i) => {
        const filled = i < current;
        const isLast = i === target - 1;

        if (isLast) {
          return (
            <div
              key={i}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                rewardReady
                  ? "bg-[#C89B3C]/15 ring-2 ring-[#C89B3C] scale-110"
                  : "bg-[#E8E4DF] scale-90 opacity-60"
              }`}
            >
              🎁
            </div>
          );
        }

        return (
          <div
            key={i}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
              filled
                ? "bg-[#6B4226]/10 scale-100"
                : "bg-[#E8E4DF] scale-90 opacity-40"
            }`}
          >
            {filled ? "☕" : (
              <span className="w-3 h-3 rounded-full bg-[#D4CFC8] block" />
            )}
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
