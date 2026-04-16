"use client";

import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import { Gift, Coffee, Flame, Sparkles } from "lucide-react";

/**
 * Compact loyalty progress banner — shows between hero and category tabs.
 * States: loading, reward ready (celebration), near completion (urgency),
 * happy hour active (badge), normal progress.
 */
export function LoyaltyBanner() {
  const loyalty = useLoyalty();

  if (!loyalty || loyalty.isLoading || !loyalty.progress) return null;

  const { progress, reward, bonuses, upsell } = loyalty.progress;

  // Don't show if target is 0 (program misconfigured)
  if (progress.target <= 0) return null;

  const progressInCycle = progress.current % progress.target;
  const fillPercent = Math.min(100, Math.round((progressInCycle / progress.target) * 100));

  // Reward ready → celebration state
  if (reward.ready) {
    const expiryText = reward.expiresAt ? getExpiryText(reward.expiresAt) : null;

    return (
      <div className="max-w-[480px] mx-auto px-4 pt-3">
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-md px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-600 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-800 text-sm">🎁 Ödülünüz Hazır!</p>
              <p className="text-xs text-amber-600 mt-0.5">{reward.message}</p>
              {expiryText && (
                <p className="text-[10px] text-amber-500 mt-0.5">{expiryText}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Near completion → urgency state
  const isNearCompletion = bonuses.nearCompletion && bonuses.stampsAway > 0;

  return (
    <div className="max-w-[480px] mx-auto px-4 pt-3">
      <div
        className={`rounded-xl border shadow-sm px-4 py-3 transition-all ${
          isNearCompletion
            ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300"
            : "bg-card border-border"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isNearCompletion ? "bg-amber-100" : "bg-primary/10"
            }`}
          >
            {isNearCompletion ? (
              <Flame className="w-4 h-4 text-amber-600" />
            ) : (
              <Coffee className="w-4 h-4 text-primary" />
            )}
          </div>

          {/* Progress info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-semibold text-xs ${isNearCompletion ? "text-amber-800" : "text-foreground"}`}>
                {isNearCompletion
                  ? `🔥 Sadece ${bonuses.stampsAway} kaldı!`
                  : `☕ ${progressInCycle}/${progress.target}`}
              </p>

              {/* Happy hour badge */}
              {bonuses.happyHour && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">
                  <Sparkles className="w-2.5 h-2.5" />
                  {bonuses.multiplier}x puan
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isNearCompletion
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-primary"
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>

            {/* Upsell message */}
            {upsell && (
              <p className="text-[10px] text-muted-foreground mt-1">{upsell.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Format expiry as "2 gün kaldı" */
function getExpiryText(expiresAt: string): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi dolmuş";
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return "Son gün! ⏰";
  return `${days} gün kaldı ⏰`;
}
