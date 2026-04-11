"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X, Gift, Coffee } from "lucide-react";
import type { LoyaltyProgressResponse } from "@/types";

interface OrderStatusData {
  status?: string;
  // Legacy fields
  loyalty_stamp_count?: number | null;
  loyalty_stamps_needed?: number | null;
  loyalty_reward_earned?: boolean;
  loyalty_reward_message?: string | null;
  // New rich loyalty
  loyalty?: LoyaltyProgressResponse;
}

/**
 * Always-mounted component that polls /api/orders/status for the current
 * session_id. Shows banners for order-ready and loyalty reward/progress.
 *
 * Lifecycle:
 *   1. "ready"     → green banner "Siparişiniz Hazır!"
 *   2. "delivered" + reward → gold celebration banner
 *   3. "delivered" + no reward → stamp progress info
 *   4. Stops polling after "delivered"
 *
 * Lives in OrderingWrapper so it survives drawer open/close.
 * Only active for cafe module when a session_id exists in sessionStorage.
 */
export function OrderReadyWatcher({ moduleType }: { moduleType?: "cafe" | "restaurant" }) {
  const [orderReady, setOrderReady] = useState(false);
  const [orderDelivered, setOrderDelivered] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<OrderStatusData | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [dismissedReady, setDismissedReady] = useState(false);
  const [dismissedLoyalty, setDismissedLoyalty] = useState(false);

  const isCafe = moduleType === "cafe";

  // Pick up session_id written by CartDrawer after a successful order
  useEffect(() => {
    if (!isCafe) return;

    const check = () => {
      const sid = sessionStorage.getItem("session_id");
      setSessionCode(sid);
    };

    check();
    // Re-check periodically in case an order is placed after mount
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [isCafe]);

  // Poll order status every 5 s — continues through "delivered"
  useEffect(() => {
    if (!isCafe || !sessionCode || orderDelivered) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/orders/status?sessionId=${encodeURIComponent(sessionCode)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as OrderStatusData;

        if (data.status === "ready" && !orderReady) {
          setOrderReady(true);
          fireNotification(sessionCode, "Siparişiniz Hazır! 🎉", `${sessionCode} — Lütfen bardan teslim alın.`);
          playBeep();
        }

        if (data.status === "delivered") {
          setOrderDelivered(true);
          setLoyaltyData(data);

          if (data.loyalty_reward_earned) {
            fireNotification(
              sessionCode,
              "🎉 Sadakat Ödülü Kazandınız!",
              data.loyalty_reward_message || "Tebrikler! Ödülünüzü bardan teslim alın."
            );
            playCelebration();
          }
        }
      } catch {
        // Network error — retry on next tick
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 5000);
    return () => clearInterval(interval);
  }, [isCafe, sessionCode, orderReady, orderDelivered]);

  const richLoyalty = loyaltyData?.loyalty;
  const hasReward = richLoyalty?.reward.ready || loyaltyData?.loyalty_reward_earned;
  const rewardMessage = richLoyalty?.reward.message || loyaltyData?.loyalty_reward_message;
  const target = richLoyalty?.progress.target ?? 0;
  const showProgress = orderDelivered && richLoyalty && target > 0 && !hasReward;
  const progressInCycle = target > 0 ? (richLoyalty?.progress.current ?? 0) % target : 0;
  const fillPercent = target > 0
    ? Math.min(100, Math.round((progressInCycle / target) * 100))
    : 0;

  return (
    <>
      {/* Banner 1: Order Ready */}
      {orderReady && !dismissedReady && (
        <div className="fixed top-0 inset-x-0 z-[60] animate-slide-down">
          <div className="max-w-[480px] mx-auto px-4 pt-3">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-300 shadow-lg px-4 py-3">
              <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0 animate-bounce" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-green-700 text-sm">Siparişiniz Hazır! 🎉</p>
                {sessionCode && (
                  <p className="text-xs text-green-600 font-mono font-semibold tracking-wider">
                    {sessionCode} — Bardan teslim alın
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDismissedReady(true)}
                className="w-7 h-7 rounded-full bg-green-200/60 flex items-center justify-center hover:bg-green-300/60 transition-colors"
              >
                <X className="w-4 h-4 text-green-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner 2: Loyalty Reward Celebration */}
      {hasReward && !dismissedLoyalty && (
        <div className="fixed top-0 inset-x-0 z-[61] animate-slide-down" style={{ top: orderReady && !dismissedReady ? "64px" : "0" }}>
          <div className="max-w-[480px] mx-auto px-4 pt-3">
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-400 shadow-lg px-4 py-4">
              <Gift className="w-8 h-8 text-amber-600 shrink-0 animate-bounce" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-700 text-sm">🎉 Sadakat Ödülü Kazandınız!</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {rewardMessage || "Tebrikler! Ödülünüzü bardan teslim alın."}
                </p>
                {richLoyalty?.reward.expiresAt && (
                  <p className="text-[10px] text-amber-500 mt-0.5">
                    {getExpiryText(richLoyalty.reward.expiresAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDismissedLoyalty(true)}
                className="w-7 h-7 rounded-full bg-amber-200/60 flex items-center justify-center hover:bg-amber-300/60 transition-colors"
              >
                <X className="w-4 h-4 text-amber-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner 3: Stamp Progress (no reward, but show progress) */}
      {showProgress && !dismissedLoyalty && (
        <div className="fixed top-0 inset-x-0 z-[61] animate-slide-down" style={{ top: orderReady && !dismissedReady ? "64px" : "0" }}>
          <div className="max-w-[480px] mx-auto px-4 pt-3">
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 shadow-md px-4 py-3">
              <Coffee className="w-6 h-6 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-blue-700 text-sm">
                    ☕ {progressInCycle}/{target}
                  </p>
                  {richLoyalty?.bonuses.happyHour && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                      ✨ {richLoyalty.bonuses.multiplier}x
                    </span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
                {richLoyalty?.bonuses.nearCompletion && (richLoyalty.bonuses.stampsAway > 0) && (
                  <p className="text-xs text-blue-500 mt-1">
                    🔥 Sadece {richLoyalty.bonuses.stampsAway} sipariş kaldı!
                  </p>
                )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedLoyalty(true)}
                className="w-7 h-7 rounded-full bg-blue-200/60 flex items-center justify-center hover:bg-blue-300/60 transition-colors"
              >
                <X className="w-4 h-4 text-blue-700" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── helpers ── */

function getExpiryText(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süresi dolmuş";
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return "Son gün! ⏰";
  return `${days} gün kaldı ⏰`;
}

function fireNotification(sessionCode: string, title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag: `order-${sessionCode}` });
    }
  } catch {
    // Notification API unavailable
  }
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // AudioContext unavailable
  }
}

function playCelebration() {
  try {
    const ctx = new AudioContext();
    // Play a short ascending melody: C5 → E5 → G5
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.25;
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.2);
    });
  } catch {
    // AudioContext unavailable
  }
}
