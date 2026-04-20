"use client";

import { X } from "lucide-react";

const SEEN_KEY = "loyalty_onboarding_seen";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return !!localStorage.getItem(SEEN_KEY);
}

export function markOnboardingSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SEEN_KEY, "1");
  }
}

interface OnboardingSheetProps {
  open: boolean;
  onClose: () => void;
  clubName?: string;
}

const BENEFITS = [
  {
    icon: "☕",
    title: "Damga Sistemi",
    desc: "Her siparişte otomatik damga — belirli sayıda siparişte ücretsiz ürün kazanırsın!",
  },
  {
    icon: "⭐",
    title: "Puan Kazan",
    desc: "Uygulama yükle, paylaş, yorum yap — puanlarla mağaza ödülleri al.",
  },
  {
    icon: "🔔",
    title: "Anında Bildirim",
    desc: "Siparişin hazır olduğunda bildirim alırsın. Hiçbir şeyi kaçırma.",
  },
  {
    icon: "🔥",
    title: "Streak Bonusu",
    desc: "Üst üste geldiğinde bonus çarpan! Daha az siparişle daha fazla ödül.",
  },
] as const;

export function OnboardingSheet({ open, onClose, clubName = "Coffee Club" }: OnboardingSheetProps) {
  if (!open) return null;

  const handleClose = () => {
    markOnboardingSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto bg-background rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="px-5 pb-8 pt-3">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#6B4226] flex items-center justify-center shadow-lg">
              <span className="text-3xl">☕</span>
            </div>
            <h2 className="text-[18px] font-bold text-foreground mb-2">
              {clubName}&apos;e Hoş Geldin!
            </h2>
            <p className="text-sm text-muted-foreground">
              Her siparişte puan kazan, ödül kazan.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-7">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                <span className="text-xl shrink-0 mt-0.5">{b.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full h-12 rounded-xl bg-[#6B4226] text-white text-sm font-bold hover:bg-[#5a3820] active:scale-[0.98] transition-all shadow-md"
          >
            Başlayalım! ☕
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Her sipariş otomatik kaydedilir — hesap açmana gerek yok.
          </p>
        </div>
      </div>
    </div>
  );
}
