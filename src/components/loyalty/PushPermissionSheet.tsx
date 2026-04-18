"use client";

import { useState, useEffect } from "react";
import { Bell, X, Loader2, Check } from "lucide-react";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";

type PushSheetReason = "cart_add" | "near_reward" | "reward_ready" | "manual";
type SheetStatus = "idle" | "requesting" | "success";

interface CopyConfig {
  icon: string;
  headline: string;
  body: string;
}

function getSheetCopy(
  reason: PushSheetReason,
  stampsAway?: number,
  rewardName?: string
): CopyConfig {
  const reward = rewardName ?? "kahve";
  switch (reason) {
    case "cart_add":
      return {
        icon: "☕",
        headline: "Siparişin hazır olduğunda haber verelim mi?",
        body: "Mutfaktan çıkınca anlık bildirim alırsın",
      };
    case "near_reward":
      return {
        icon: "🎁",
        headline: `${stampsAway ?? "Az"} kahve kaldı → bedava ${reward}!`,
        body: "Ödülünü kazandığında seni haberdar edelim",
      };
    case "reward_ready":
      return {
        icon: "🎉",
        headline: `Bedava ${reward} kazandın!`,
        body: "Bir dahaki ödülüne yaklaştığında bildirim gönderelim",
      };
    case "manual":
      return {
        icon: "🔔",
        headline: "Coffee Club Bildirimleri",
        body: "Sipariş, ödül, indirim — tek bildirimle",
      };
  }
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Bottom sheet for push notification opt-in.
 * Reads its own open/reason state from LoyaltyContext  no props needed.
 * Shows context-aware copy per pushSheetReason.
 * On iOS (non-standalone), shows Add-to-Home-Screen guide since push
 * notifications only work in installed iOS PWAs (iOS 16.4+).
 */
export function PushPermissionSheet() {
  const loyalty = useLoyalty();
  const [status, setStatus] = useState<SheetStatus>("idle");
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  const open = loyalty?.pushSheetOpen ?? false;
  const reason = loyalty?.pushSheetReason ?? "cart_add";
  const stampsAway = loyalty?.progress?.bonuses.stampsAway;
  const rewardName = loyalty?.rewardItem?.name;
  const needsIOSInstall = detectIOS() && !detectStandalone();

  // Reset internal status each time the sheet opens
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setShowIOSSteps(false);
    }
  }, [open]);

  const handleAllow = async () => {
    if (!loyalty) return;
    setStatus("requesting");
    await loyalty.requestPushPermission();
    // Check native API directly  more reliable than waiting for React state flush
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setStatus("success");
      setTimeout(() => loyalty.dismissPushSheet(), 2000);
    } else {
      // Denied  close sheet silently
      loyalty.dismissPushSheet();
    }
  };

  if (!open) return null;

  const copy = getSheetCopy(reason, stampsAway, rewardName);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => loyalty?.dismissPushSheet()}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto bg-background rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Dismiss X */}
        <button
          type="button"
          onClick={() => loyalty?.dismissPushSheet()}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {status === "success" ? (
          <SuccessView />
        ) : showIOSSteps ? (
          <IOSInstructions onClose={() => setShowIOSSteps(false)} />
        ) : (
          <MainView
            copy={copy}
            status={status}
            needsIOSInstall={needsIOSInstall}
            onAllow={() => { void handleAllow(); }}
            onDismiss={() => loyalty?.dismissPushSheet()}
            onShowIOSSteps={() => setShowIOSSteps(true)}
          />
        )}
      </div>
    </div>
  );
}

/*  Main view  */
function MainView({
  copy,
  status,
  needsIOSInstall,
  onAllow,
  onDismiss,
  onShowIOSSteps,
}: {
  copy: CopyConfig;
  status: SheetStatus;
  needsIOSInstall: boolean;
  onAllow: () => void;
  onDismiss: () => void;
  onShowIOSSteps: () => void;
}) {
  return (
    <div className="px-5 pb-8 pt-2">
      {/* Icon + headline + body */}
      <div className="text-center mb-5">
        <div className="text-4xl mb-3">{copy.icon}</div>
        <h2 className="text-[17px] font-bold text-foreground leading-snug mb-1.5">
          {copy.headline}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
      </div>

      {/* Benefit pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {(["☕ Siparişin hazır", "🎁 Ödül kazandın", "🔥 Özel fırsat"] as const).map((pill) => (
          <span
            key={pill}
            className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground font-medium"
          >
            {pill}
          </span>
        ))}
      </div>

      {/* Primary CTA */}
      {needsIOSInstall ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-blue-700 mb-0.5">
              🍏 iOS&apos;ta bildirim almak için
            </p>
            <p className="text-xs text-blue-500">Uygulamayı önce Ana Ekrana eklemelisin</p>
          </div>
          <button
            type="button"
            onClick={onShowIOSSteps}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
          >
            📲 Ana Ekrana Nasıl Eklenir?
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAllow}
          disabled={status === "requesting"}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 transition-all shadow-md mb-3"
        >
          {status === "requesting" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {status === "requesting" ? "İzin İsteniyor..." : "Bildirimleri Aç"}
        </button>
      )}

      {/* Secondary dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors mt-1"
      >
        Şimdi Değil
      </button>
    </div>
  );
}

/*  Success view  shown for 2s then sheet auto-closes  */
function SuccessView() {
  return (
    <div className="px-5 pb-10 pt-4 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Bildirimler açık! ✅</h2>
        <p className="text-sm text-muted-foreground">
          Siparişin hazır olduğunda haber vereceğiz.
        </p>
      </div>
    </div>
  );
}

/*  iOS step-by-step install guide  */
function IOSInstructions({ onClose }: { onClose: () => void }) {
  const steps = [
    { icon: "1️⃣", text: 'Tarayıcının alt menüsündeki "Paylaş" (□↑) butonuna bas' },
    { icon: "2️⃣", text: '"Ana Ekrana Ekle"\'yi seç' },
    { icon: "3️⃣", text: 'Sağ üstteki "Ekle"ye bas' },
    { icon: "4️⃣", text: "Ana ekrandan uygulamayı aç" },
    { icon: "5️⃣", text: 'Menüde "Bildirimleri Aç" butonuna bas' },
  ];

  return (
    <div className="px-5 pt-2 pb-8">
      <div className="text-center mb-5">
        <div className="text-3xl mb-2">📲</div>
        <h2 className="text-lg font-bold text-foreground mb-1">Ana Ekrana Ekle</h2>
        <p className="text-xs text-muted-foreground">
          iOS&apos;ta bildirimleri etkinleştirmek için şu adımları izle:
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

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center mb-4">
        <p className="text-xs text-amber-700">
          Safari&apos;nin paylaş ikonu:{" "}
          <span className="font-bold text-amber-800">□↑</span> — ekranın alt ortasında
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        Geri Dön
      </button>
    </div>
  );
}
