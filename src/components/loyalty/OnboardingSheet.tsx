"use client";

import { useState, useEffect } from "react";
import { X, Coffee, Star, Gift } from "lucide-react";

const SEEN_KEY = "loyalty_onboarding_seen";
const SHOW_DELAY_MS = 1500;

/** Detect language from localStorage or navigator — standalone (no LanguageProvider needed). */
function detectLang(): "tr" | "en" {
  if (typeof window === "undefined") return "tr";
  const stored = localStorage.getItem("lezzet-lang");
  if (stored === "en") return "en";
  if (stored === "tr") return "tr";
  const nav = navigator.language?.toLowerCase() ?? "";
  return nav.startsWith("en") ? "en" : "tr";
}

const copy = {
  tr: {
    title: "Coffee Club'a Hoş Geldin ☕",
    steps: [
      { icon: Coffee, label: "Sipariş ver", desc: "QR menüden kolayca sipariş et" },
      { icon: Star, label: "Puan kazan", desc: "Her siparişte damga & puan biriktir" },
      { icon: Gift, label: "Ödül al", desc: "Hediye kahve ve indirimler seni bekliyor" },
    ],
    cta: "Anladım!",
  },
  en: {
    title: "Welcome to Coffee Club ☕",
    steps: [
      { icon: Coffee, label: "Place an order", desc: "Order easily from the QR menu" },
      { icon: Star, label: "Earn points", desc: "Collect stamps & points with every order" },
      { icon: Gift, label: "Get rewards", desc: "Free coffee and discounts await you" },
    ],
    cta: "Got it!",
  },
} as const;

/**
 * First-visit onboarding bottom sheet for Coffee Club.
 * Shows a 3-step guide after 1.5s delay on first cafe visit.
 * Dismisses permanently via localStorage flag.
 */
export function OnboardingSheet() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"tr" | "en">("tr");

  useEffect(() => {
    // Already seen — bail out
    if (localStorage.getItem(SEEN_KEY)) return;

    setLang(detectLang());

    const timer = setTimeout(() => {
      // Double-check in case another instance set the flag during delay
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true);
      }
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  };

  if (!open) return null;

  const t = copy[lang];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto max-w-md rounded-t-2xl bg-[#F8F6F3] px-6 pb-8 pt-4 shadow-xl">
          {/* Handle + close */}
          <div className="mb-3 flex items-center justify-between">
            <div className="mx-auto h-1 w-10 rounded-full bg-[#D4C8B8]" />
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[#6B4226]/60 hover:bg-[#6B4226]/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <h2 className="mb-5 text-center text-lg font-bold text-[#3D2C1E]">
            {t.title}
          </h2>

          {/* Steps */}
          <div className="space-y-4">
            {t.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C89B3C]/15">
                  <step.icon className="h-5 w-5 text-[#C89B3C]" />
                </div>
                <div>
                  <p className="font-semibold text-[#3D2C1E] text-sm">{step.label}</p>
                  <p className="text-xs text-[#6B4226]/70">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleDismiss}
            className="mt-6 w-full rounded-xl bg-[#C89B3C] py-3 text-sm font-bold text-white shadow-md hover:bg-[#B8892E] active:scale-[0.98] transition-all"
          >
            {t.cta}
          </button>
        </div>
      </div>
    </>
  );
}
