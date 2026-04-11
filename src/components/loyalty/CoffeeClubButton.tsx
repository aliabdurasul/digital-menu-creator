"use client";

import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import { cn } from "@/lib/utils";

/**
 * Hero top-left pill that opens the Coffee Club panel.
 * Mirrors the LanguageToggle styling: white/85 backdrop blur pill.
 * Shows a quick-glance "X/Y" progress badge.
 * Hidden when loyalty is disabled or unavailable.
 */
export function CoffeeClubButton({ onClick }: { onClick: () => void }) {
  const loyalty = useLoyalty();

  if (!loyalty || loyalty.isLoading || !loyalty.progress) return null;

  const { progress, clubName } = loyalty.progress;
  if (!clubName) return null;

  const progressInCycle = progress.target > 0
    ? progress.current % progress.target
    : 0;
  const hasReward = loyalty.progress.reward.ready;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-sm border px-2.5 py-1.5 transition-colors duration-200 hover:bg-white/95 active:scale-95",
        hasReward
          ? "border-amber-400 shadow-md shadow-amber-200/50"
          : "border-[#e5e5e5]"
      )}
    >
      <span className="text-[13px] leading-none" aria-hidden>☕</span>
      <span className="text-[12px] font-semibold leading-none text-gray-800">
        {clubName}
      </span>
      {progress.target > 0 && (
        <span
          className={cn(
            "text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full",
            hasReward
              ? "bg-amber-500 text-white"
              : "bg-primary/15 text-primary"
          )}
        >
          {hasReward ? "🎁" : `${progressInCycle}/${progress.target}`}
        </span>
      )}
      <span className="text-[10px] text-gray-500 leading-none">▸</span>
    </button>
  );
}
