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
          const { requestNotificationPermission } = await import("@/lib/firebase-client");
          const token = await requestNotificationPermission(swReg);
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

    try {
      const { requestNotificationPermission } = await import("@/lib/firebase-client");
      const swReg = swRegRef.current || undefined;
      const token = await requestNotificationPermission(swReg);

      if (token) {
        setPushStatus("granted");
        await fetch("/api/push/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerKey, restaurantId, token }),
        });
      } else {
        setPushStatus("denied");
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
    <LoyaltyContext.Provider value={{ progress, isLoading, customerKey, refetch, clubName, rewardItem, panelOpen, setPanelOpen, requestPushPermission, pushStatus }}>
      {children}
    </LoyaltyContext.Provider>
  );
}
