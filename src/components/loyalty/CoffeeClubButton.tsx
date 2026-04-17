"use client";

import { useLoyalty } from "@/components/menu/LoyaltyProvider";

/**
 * Hero pill button that opens the Coffee Club panel.
 * Positioned in the top-left of the hero cover image.
 * Hidden when loyalty program is disabled or not loaded.
 */
export function CoffeeClubButton() {
  const loyalty = useLoyalty();

  if (!loyalty?.progress?.progress || loyalty.progress.progress.target <= 0) return null;

  const { progress, clubName, setPanelOpen } = loyalty;
  const target = progress.progress.target;
  const current = progress.progress.current % target;

  return (
    <button
      type="button"
      onClick={() => setPanelOpen(true)}
      className="flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-[#e5e5e5] px-3 py-1.5 text-[12px] font-medium transition-all duration-200 hover:bg-white/95 hover:shadow-sm active:scale-95"
    >
      <span>☕</span>
      <span className="text-gray-800">{clubName}</span>
      <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
        {current}/{target}
      </span>
      <span className="text-gray-400 text-[10px]">▸</span>
    </button>
  );
}
