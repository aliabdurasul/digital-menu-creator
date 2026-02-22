"use client";

/**
 * Client-side feature flag hooks and context.
 *
 * Server Components compute the feature map and pass it down via
 * <FeatureFlagProvider>. Client components consume flags via useFeatureFlag().
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { FeatureKey } from "./flags";

/* ─── Types ─── */

interface FeatureFlagContextValue {
  /** Map of feature key → enabled boolean */
  features: Record<string, boolean>;
  /** The restaurant's current plan */
  plan: "basic" | "pro";
}

/* ─── Context ─── */

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  features: {},
  plan: "basic",
});

/* ─── Provider ─── */

interface FeatureFlagProviderProps {
  /** Feature map computed on the server (from getAllFeatures()) */
  features: Record<string, boolean>;
  /** The restaurant's plan */
  plan: "basic" | "pro";
  children: ReactNode;
}

/**
 * Provide feature flags to client components.
 *
 * @example
 *   // In a Server Component or layout:
 *   const features = await getAllFeatures(restaurant.id);
 *   return (
 *     <FeatureFlagProvider features={features} plan={restaurant.plan}>
 *       <AdminDashboard />
 *     </FeatureFlagProvider>
 *   );
 */
export function FeatureFlagProvider({
  features,
  plan,
  children,
}: FeatureFlagProviderProps) {
  return (
    <FeatureFlagContext.Provider value={{ features, plan }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/* ─── Hooks ─── */

/**
 * Check if a feature is enabled in the current context.
 *
 * @example
 *   const { enabled } = useFeatureFlag("custom_domain");
 *   if (!enabled) return <UpgradeBanner />;
 */
export function useFeatureFlag(featureKey: FeatureKey): {
  enabled: boolean;
  plan: "basic" | "pro";
} {
  const ctx = useContext(FeatureFlagContext);
  return {
    enabled: ctx.features[featureKey] ?? false,
    plan: ctx.plan,
  };
}

/**
 * Get all feature flags at once.
 *
 * @example
 *   const { features, plan } = useFeatureFlags();
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  return useContext(FeatureFlagContext);
}
