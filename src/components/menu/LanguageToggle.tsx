"use client";

import { useLanguage } from "@/components/menu/LanguageProvider";
import type { Lang } from "@/lib/translations";

/**
 * Minimal TR/EN toggle button for the public menu.
 * Displays as a small pill in the top-right of the sticky header.
 */
export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const toggleLang = () => setLang(lang === "tr" ? "en" : "tr");

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[32px]"
      aria-label={lang === "tr" ? "Switch to English" : "Türkçe'ye geç"}
    >
      <span className={lang === "tr" ? "font-bold text-foreground" : ""}>TR</span>
      <span className="text-border mx-0.5">|</span>
      <span className={lang === "en" ? "font-bold text-foreground" : ""}>EN</span>
    </button>
  );
}
