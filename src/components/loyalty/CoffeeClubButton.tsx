"use client";

import { useLoyalty } from "@/components/menu/LoyaltyProvider";

/**
 * Hero pill button that opens the Coffee Club panel.
 * Positioned in the top-left of the hero cover image.
 * Shows streak flame + notification dot for engagement.
 */
export function CoffeeClubButton() {
  const loyalty = useLoyalty();

  if (!loyalty?.progress?.progress || loyalty.progress.progress.target <= 0) return null;

  const { progress, clubName, setPanelOpen } = loyalty;
  const target = progress.progress.target;
  const current = progress.progress.current % target;

  const streakActive = progress.streak?.count > 0;
  const hasNotification =
    progress.reward?.ready ||
    progress.inactivityBonus?.active ||
    progress.secretReward?.won;

  return (
    <button
      type="button"
      onClick={() => setPanelOpen(true)}
      className="relative flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-[#e5e5e5] px-3 py-1.5 text-[12px] font-medium transition-all duration-200 hover:bg-white/95 hover:shadow-sm active:scale-95"
    >
      <span>☕</span>
      {streakActive && <span className="text-[11px]">🔥</span>}
      <span className="text-gray-800">{clubName}</span>
      <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
        {current}/{target}
      </span>
      <span className="text-gray-400 text-[10px]">▸</span>

      {/* Notification dot */}
      {hasNotification && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
      )}
    </button>
  );
}
