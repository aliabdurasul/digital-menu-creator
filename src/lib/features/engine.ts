/**
 * Feature Flag Evaluation Engine — pure function.
 *
 * Takes a feature key and a plan, returns whether the feature is enabled.
 * Designed to be easily testable and extendable with per-tenant overrides.
 */

import { FEATURES, type FeatureKey, type Plan } from "./flags";

export interface FeatureEvaluationContext {
  plan: Plan;
  /**
   * Optional per-tenant overrides.
   * When present, these take priority over plan-based evaluation.
   * Future: fetched from a `feature_overrides` table.
   */
  overrides?: Partial<Record<FeatureKey, boolean>>;
}

/**
 * Evaluate whether a feature is enabled for the given context.
 *
 * Evaluation order:
 *   1. Per-tenant override (if exists) → use override value
 *   2. Plan-based check → feature.plans.includes(context.plan)
 *   3. Default → feature.defaultEnabled
 *
 * @param featureKey - The feature to evaluate
 * @param context    - Plan and optional overrides
 * @returns Whether the feature is enabled
 *
 * @example
 *   evaluateFeature("custom_domain", { plan: "pro" })   // true
 *   evaluateFeature("custom_domain", { plan: "basic" }) // false
 *   evaluateFeature("custom_domain", { plan: "basic", overrides: { custom_domain: true } }) // true
 */
export function evaluateFeature(
  featureKey: FeatureKey,
  context: FeatureEvaluationContext
): boolean {
  const feature = FEATURES[featureKey];

  // Unknown feature key → disabled
  if (!feature) {
    console.warn(`[features/engine] Unknown feature key: ${featureKey}`);
    return false;
  }

  // 1. Check per-tenant override
  if (context.overrides && featureKey in context.overrides) {
    return context.overrides[featureKey]!;
  }

  // 2. Plan-based evaluation
  if (feature.plans.includes(context.plan)) {
    return true;
  }

  // 3. Default
  return feature.defaultEnabled;
}

/**
 * Evaluate all features for a given context.
 * Returns a record of feature key → enabled boolean.
 */
export function evaluateAllFeatures(
  context: FeatureEvaluationContext
): Record<FeatureKey, boolean> {
  const result = {} as Record<FeatureKey, boolean>;
  for (const key of Object.keys(FEATURES) as FeatureKey[]) {
    result[key] = evaluateFeature(key, context);
  }
  return result;
}
