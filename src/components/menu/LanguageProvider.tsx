"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { Restaurant } from "@/types";

type Lang = "tr" | "en";

interface LanguageContextValue {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  restaurant: Restaurant;
  hasEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "lezzet-lang";

interface LanguageProviderProps {
  restaurantTr: Restaurant;
  restaurantEn: Restaurant | null;
  children: React.ReactNode;
}

/**
 * Provides reactive language state + the correct Restaurant data.
 * Reads initial language from localStorage; defaults to "tr".
 * If restaurantEn is null, language is locked to "tr".
 */
export function LanguageProvider({
  restaurantTr,
  restaurantEn,
  children,
}: LanguageProviderProps) {
  const hasEnglish = restaurantEn !== null;

  const [language, setLanguageRaw] = useState<Lang>("tr");

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  // If no stored preference exists, bootstrap from browser language
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" && hasEnglish) {
        setLanguageRaw("en");
      } else if (!stored && hasEnglish) {
        // First visit: detect browser language
        const browserLang = navigator.language?.toLowerCase() ?? "";
        if (!browserLang.startsWith("tr")) {
          setLanguageRaw("en");
          localStorage.setItem(STORAGE_KEY, "en");
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, [hasEnglish]);

  const setLanguage = (lang: Lang) => {
    const next = lang === "en" && hasEnglish ? "en" : "tr";
    setLanguageRaw(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  };

  const restaurant = useMemo(
    () => (language === "en" && restaurantEn ? restaurantEn : restaurantTr),
    [language, restaurantTr, restaurantEn]
  );

  const value = useMemo(
    () => ({ language, setLanguage, restaurant, hasEnglish }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, restaurant, hasEnglish]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to consume the language context.
 * Must be used inside <LanguageProvider>.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/** UI label map for hardcoded strings */
export const UI_LABELS = {
  ingredients: { tr: "Malzemeler", en: "Ingredients" },
  portion: { tr: "Porsiyon:", en: "Portion:" },
  unavailable: { tr: "Mevcut Değil", en: "Unavailable" },
} as const;
