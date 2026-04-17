/**
 * Client-side loyalty helpers — localStorage identity + progress fetching.
 * Used by LoyaltyProvider and CartDrawer on the public menu.
 */

import type { LoyaltyProgressResponse } from "@/types";

export const CUSTOMER_KEY_STORAGE = "lz_customer_key";

/**
 * Get or create a persistent customer key in localStorage.
 * Survives tab close and page reloads (unlike sessionStorage).
 */
export function getOrCreateCustomerKey(): string {
  if (typeof window === "undefined") return "";

  let key = localStorage.getItem(CUSTOMER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(CUSTOMER_KEY_STORAGE, key);
  }
  return key;
}

/**
 * Fetch loyalty progress from the API for the current customer_key.
 * Returns null if loyalty is disabled or no program exists.
 */
export async function fetchLoyaltyProgress(
  restaurantId: string
): Promise<LoyaltyProgressResponse | null> {
  const customerKey = getOrCreateCustomerKey();
  if (!customerKey) return null;

  try {
    const res = await fetch(
      `/api/loyalty/progress?restaurantId=${encodeURIComponent(restaurantId)}&customerKey=${encodeURIComponent(customerKey)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Validate response shape — API returns { enabled: false } when disabled
    if (!data || !data.progress || typeof data.progress.target !== "number") {
      return null;
    }
    return data as LoyaltyProgressResponse;
  } catch {
    return null;
  }
}
