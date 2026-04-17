"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

  // Register FCM service worker and request push token
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!restaurantId || !customerKey) return;

    (async () => {
      try {
        // Register FCM service worker
        const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        // Dynamically import to keep bundle size down (client-side only)
        const { requestNotificationPermission } = await import("@/lib/firebase-client");
        const token = await requestNotificationPermission(swReg);

        if (token) {
          // Save FCM token to backend
          await fetch("/api/push/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerKey,
              restaurantId,
              token,
            }),
          });
        }
      } catch {
        // Push setup failed — non-critical, loyalty still works
      }
    })();
  }, [restaurantId, customerKey]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchProgress();
  }, [fetchProgress]);

  const clubName = progress?.clubName || "Coffee Club";
  const rewardItem = progress?.rewardItem ?? null;

  return (
    <LoyaltyContext.Provider value={{ progress, isLoading, customerKey, refetch, clubName, rewardItem, panelOpen, setPanelOpen }}>
      {children}
    </LoyaltyContext.Provider>
  );
}
