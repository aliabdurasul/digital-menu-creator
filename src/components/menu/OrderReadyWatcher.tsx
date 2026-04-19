"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

interface OrderStatusData {
  status?: string;
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
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [dismissedReady, setDismissedReady] = useState(false);

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
          playBeep();
        }

        if (data.status === "delivered") {
          setOrderDelivered(true);
        }
      } catch {
        // Network error — retry on next tick
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 5000);
    return () => clearInterval(interval);
  }, [isCafe, sessionCode, orderReady, orderDelivered]);

  return (
    <>
      {/* Banner: Order Ready */}
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
    </>
  );
}

/* ── helpers ── */

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
