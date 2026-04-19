"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { LoyaltyProgressResponse } from "@/types";
import { getOrCreateCustomerKey, fetchLoyaltyProgress } from "@/lib/loyalty-client";

interface LoyaltyContextValue {
  progress: LoyaltyProgressResponse | null;
  isLoading: boolean;
  customerKey: string;
  refetch: () => Promise<void>;
  clubName: string;
  rewardItem: { name: string; image?: string; menuItemId?: string } | null;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** Call from a user-gesture handler (tap/click) to request push permission */
  requestPushPermission: () => Promise<void>;
  pushStatus: "idle" | "granted" | "denied";
  pushSheetOpen: boolean;
  pushSheetReason: "cart_add" | "near_reward" | "reward_ready" | "manual";
  /** Open the push permission sheet. Respects 24h snooze and pushStatus guards. */
  triggerPushSheet: (reason: "cart_add" | "near_reward" | "reward_ready" | "manual") => void;
  /** Close the sheet and snooze for 24h. */
  dismissPushSheet: () => void;
}

const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);

export function useLoyalty() {
  return useContext(LoyaltyContext);
}

interface LoyaltyProviderProps {
  restaurantId: string;
  children: ReactNode;
}

/**
 * Provides loyalty progress state to the entire ordering flow.
 * On mount: creates/reads customer_key from localStorage, fetches progress from API.
 * Exposes refetch() for CartDrawer to call after successful order.
 */
export function LoyaltyProvider({ restaurantId, children }: LoyaltyProviderProps) {
  const [progress, setProgress] = useState<LoyaltyProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customerKey, setCustomerKey] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [pushSheetOpen, setPushSheetOpen] = useState(false);
  const [pushSheetReason, setPushSheetReason] = useState<"cart_add" | "near_reward" | "reward_ready" | "manual">("cart_add");
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const result = await fetchLoyaltyProgress(restaurantId);
      setProgress(result);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const key = getOrCreateCustomerKey();
    setCustomerKey(key);
    void fetchProgress();
    // Track last visited menu path for PWA start_url redirect
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/r/") || path.startsWith("/menu/")) {
        localStorage.setItem("last_menu_path", path.startsWith("/menu/") ? path.replace("/menu/", "/r/") : path);
      }
    }
  }, [fetchProgress]);

  // Register FCM service worker on mount (does NOT request permission)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!restaurantId || !customerKey) return;

    (async () => {
      try {
        const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        swRegRef.current = swReg;

        // If permission was already granted (returning user), silently refresh token
        if (Notification.permission === "granted") {
          setPushStatus("granted");
          const { getMessagingToken } = await import("@/lib/firebase-client");
          const token = await getMessagingToken(swReg);
          if (token) {
            await fetch("/api/push/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customerKey, restaurantId, token }),
            });
          }
        } else if (Notification.permission === "denied") {
          setPushStatus("denied");
        }
      } catch {
        // SW registration failed — non-critical
      }
    })();
  }, [restaurantId, customerKey]);

  // Auto-trigger push sheet based on loyalty milestone (fires once after progress loads)
  useEffect(() => {
    if (!progress || pushStatus !== "idle") return;
    if (progress.secretReward?.won) {
      triggerPushSheet("reward_ready");
    } else if (progress.reward.ready) {
      triggerPushSheet("reward_ready");
    } else if (progress.bonuses.stampsAway <= 2 && progress.bonuses.stampsAway > 0) {
      triggerPushSheet("near_reward");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.reward.ready, progress?.bonuses.stampsAway, progress?.secretReward?.won, pushStatus]);

  /** Open push sheet — guards: pushStatus must be "idle", no active 24h snooze, sheet not already open. */
  const triggerPushSheet = useCallback(
    (reason: "cart_add" | "near_reward" | "reward_ready" | "manual") => {
      if (typeof window === "undefined") return;
      if (pushStatus !== "idle" || pushSheetOpen) return;
      const snoozed = localStorage.getItem("push_prompt_snoozed");
      if (snoozed && Date.now() < new Date(snoozed).getTime() + 24 * 60 * 60 * 1000) return;
      setPushSheetReason(reason);
      setPushSheetOpen(true);
    },
    [pushStatus, pushSheetOpen]
  );

  /** Close sheet and write 24h snooze to localStorage. */
  const dismissPushSheet = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("push_prompt_snoozed", new Date().toISOString());
    }
    setPushSheetOpen(false);
  }, []);

  /**
   * Request push permission — MUST be called from a user gesture (click/tap).
   * Browsers auto-block prompts not triggered by user interaction.
   */
  const requestPushPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }
    if (pushStatus === "granted") return;

    // IMPORTANT: Call requestPermission FIRST, before any dynamic import.
    // Dynamic imports can break the browser's user-gesture chain in some browsers,
    // causing the permission prompt to be silently blocked.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("denied");
      return;
    }
    setPushStatus("granted");

    try {
      // Safe to dynamic-import now — permission is already granted
      const { getMessagingToken } = await import("@/lib/firebase-client");
      const token = await getMessagingToken(swRegRef.current || undefined);

      if (token) {
        await fetch("/api/push/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerKey, restaurantId, token }),
        });
      }
    } catch {
      // Non-critical
    }
  }, [customerKey, restaurantId, pushStatus]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchProgress();
  }, [fetchProgress]);

  const clubName = progress?.clubName || "Coffee Club";
  const rewardItem = progress?.rewardItem ?? null;

  return (
    <LoyaltyContext.Provider value={{ progress, isLoading, customerKey, refetch, clubName, rewardItem, panelOpen, setPanelOpen, requestPushPermission, pushStatus, pushSheetOpen, pushSheetReason, triggerPushSheet, dismissPushSheet }}>
      {children}
    </LoyaltyContext.Provider>
  );
}
