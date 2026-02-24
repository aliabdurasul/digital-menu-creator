import type { FeatureKey, PlanType } from "./flags";
import { FEATURE_MAP } from "./flags";

/**
 * Check if a plan can use a specific feature.
 * Pure function — no DB access, suitable for client and server.
 */
export function canUseFeature(plan: PlanType, feature: FeatureKey): boolean {
  const def = FEATURE_MAP[feature];
  if (!def) return false;
  return def.plans.includes(plan);
}

/**
 * Get all available features for a plan.
 */
export function getAvailableFeatures(plan: PlanType): FeatureKey[] {
  return (Object.keys(FEATURE_MAP) as FeatureKey[]).filter((key) =>
    FEATURE_MAP[key].plans.includes(plan)
  );
}

/**
 * Check if feature requires pro — shorthand for UI gating.
 */
export function requiresPro(feature: FeatureKey): boolean {
  const def = FEATURE_MAP[feature];
  return def ? def.plans.length === 1 && def.plans[0] === "pro" : false;
}
