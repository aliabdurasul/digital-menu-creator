"use client";

import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

/**
 * Minimal TR | EN pill toggle.
 * Hidden when no English translations exist.
 * Sits in the sticky tab bar, right-aligned.
 */
export function LanguageToggle() {
  const { language, setLanguage, hasEnglish } = useLanguage();

  if (!hasEnglish) return null;

  return (
    <div className="flex items-center shrink-0 rounded-full bg-muted p-0.5 gap-0.5">
      <button
        type="button"
        onClick={() => setLanguage("tr")}
        className={cn(
          "px-2 py-1 rounded-full text-[11px] font-semibold leading-none transition-all duration-200",
          language === "tr"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "px-2 py-1 rounded-full text-[11px] font-semibold leading-none transition-all duration-200",
          language === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
}
