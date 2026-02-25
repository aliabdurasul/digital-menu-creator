"use client";

import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

/**
 * Minimal TR | EN pill toggle.
 * Hidden when no English translations exist.
 * Floats in the top-right corner of the hero cover image.
 */
export function LanguageToggle() {
  const { language, setLanguage, hasEnglish } = useLanguage();

  if (!hasEnglish) return null;

  return (
    <div className="flex items-center rounded-full bg-white/85 backdrop-blur-sm border border-[#e5e5e5] px-1 py-0.5 gap-0">
      <button
        type="button"
        onClick={() => setLanguage("tr")}
        className={cn(
          "px-2.5 py-1 rounded-full text-[12px] font-medium leading-none transition-colors duration-200",
          language === "tr"
            ? "text-gray-900 bg-white/90"
            : "text-gray-400 hover:text-gray-500"
        )}
      >
        TR
      </button>
      <span className="text-gray-300 text-[10px] select-none" aria-hidden>|</span>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "px-2.5 py-1 rounded-full text-[12px] font-medium leading-none transition-colors duration-200",
          language === "en"
            ? "text-gray-900 bg-white/90"
            : "text-gray-400 hover:text-gray-500"
        )}
      >
        EN
      </button>
    </div>
  );
}
