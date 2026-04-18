"use client";

import { useState } from "react";
import { Smartphone, X, Check, Zap } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const SNOOZE_KEY = "install_prompt_snoozed";
const SNOOZE_HOURS = 48;

function isSnoozed(): boolean {
  if (typeof window === "undefined") return true;
  const ts = localStorage.getItem(SNOOZE_KEY);
  if (!ts) return false;
  return Date.now() < new Date(ts).getTime() + SNOOZE_HOURS * 60 * 60 * 1000;
}

function snooze(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SNOOZE_KEY, new Date().toISOString());
  }
}

type SheetState = "prompt" | "success";

interface InstallPromptSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet that invites the user to install the PWA.
 * On Android/Chrome: triggers the deferred `beforeinstallprompt` dialog.
 * On iOS (non-standalone): shows "Add to Home Screen" manual guide.
 *
 * Triggered by `InstallTrigger` inside `OrderingWrapper` after first order
 * or after significant engagement (loyalty panel open). Respects 48h snooze.
 */
export function InstallPromptSheet({ open, onClose }: InstallPromptSheetProps) {
  const { canInstall, triggerInstall } = useInstallPrompt();
  const [state, setState] = useState<SheetState>("prompt");
  const [installing, setInstalling] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  // Detect iOS non-standalone (must manually add to home screen)
  const isIOS =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true);
  const needsManual = isIOS && !isStandalone;

  const handleInstall = async () => {
    if (needsManual) {
      setShowIOSSteps(true);
      return;
    }
    if (!canInstall) {
      onClose();
      return;
    }
    setInstalling(true);
    const outcome = await triggerInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      setState("success");
      setTimeout(() => {
        snooze();
        onClose();
      }, 2500);
    } else {
      snooze();
      onClose();
    }
  };

  const handleDismiss = () => {
    snooze();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto bg-background rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* X dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {state === "success" ? (
          <SuccessView />
        ) : showIOSSteps ? (
          <IOSInstallGuide onBack={() => setShowIOSSteps(false)} onClose={handleDismiss} />
        ) : (
          <MainPrompt
            canInstall={canInstall || needsManual}
            installing={installing}
            needsManual={needsManual}
            onInstall={() => void handleInstall()}
            onDismiss={handleDismiss}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Main prompt view ─── */
function MainPrompt({
  canInstall,
  installing,
  needsManual,
  onInstall,
  onDismiss,
}: {
  canInstall: boolean;
  installing: boolean;
  needsManual: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  if (!canInstall && !needsManual) return null;

  return (
    <div className="px-5 pb-8 pt-3">
      {/* Icon + headline */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Smartphone className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-[17px] font-bold text-foreground mb-1.5">
          📱 App gibi kullanmak ister misin?
        </h2>
        <p className="text-sm text-muted-foreground">
          Ana ekrana ekle — daha hızlı aç, daha hızlı sipariş ver
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-2.5 mb-6">
        {([
          { icon: "⚡", text: "1 dokunuşla aç, giriş gerekmez" },
          { icon: "🔔", text: "Sipariş ve ödül bildirimleri al" },
          { icon: "☕", text: "Coffee Club ilerlemeni takip et" },
        ] as const).map((b) => (
          <div key={b.text} className="flex items-center gap-3">
            <span className="text-lg shrink-0">{b.icon}</span>
            <p className="text-sm text-foreground">{b.text}</p>
          </div>
        ))}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onInstall}
        disabled={installing}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 transition-all shadow-md mb-3"
      >
        {installing ? (
          <>
            <Zap className="w-4 h-4 animate-pulse" />
            Ekleniyor...
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4" />
            {needsManual ? "Nasıl Eklenir? →" : "Ana Ekrana Ekle"}
          </>
        )}
      </button>

      {/* Secondary skip */}
      <button
        type="button"
        onClick={onDismiss}
        className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
      >
        Web&apos;de devam et
      </button>
    </div>
  );
}

/* ─── Success view ─── */
function SuccessView() {
  return (
    <div className="px-5 pb-10 pt-4 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">
          ✅ App hazır!
        </h2>
        <p className="text-sm text-muted-foreground">
          Ana ekranından daha hızlı sipariş verebilirsin.
        </p>
      </div>
    </div>
  );
}

/* ─── iOS manual guide ─── */
function IOSInstallGuide({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const steps = [
    { icon: "1️⃣", text: 'Safari\'nin alt ortasındaki "Paylaş" (□↑) ikonuna dokun' },
    { icon: "2️⃣", text: '"Ana Ekrana Ekle" seçeneğini bul ve seç' },
    { icon: "3️⃣", text: 'Sağ üstteki "Ekle" tuşuna bas' },
    { icon: "4️⃣", text: "Ana ekrandan uygulamayı aç" },
  ];

  return (
    <div className="px-5 pt-2 pb-8">
      <div className="text-center mb-5">
        <div className="text-3xl mb-2">📲</div>
        <h2 className="text-lg font-bold text-foreground mb-1">Ana Ekrana Ekle</h2>
        <p className="text-xs text-muted-foreground">
          4 adımda app deneyimi — ücretsiz, kurulum yok
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((s) => (
          <div key={s.icon} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
            <p className="text-sm text-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-center mb-4">
        <p className="text-xs text-blue-700">
          Paylaş ikonu: <span className="font-bold">□↑</span> — Safari&apos;nin alt orta kısmında
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Geri
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Anladım ✓
        </button>
      </div>
    </div>
  );
}
