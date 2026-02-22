/**
 * Feature Flag Definitions — declarative, config-driven.
 *
 * Each feature maps to the plans that unlock it.
 * This is the single source of truth for plan-based feature gating.
 *
 * To add a new feature:
 *   1. Add a key to FeatureKey
 *   2. Add the definition to FEATURES
 *   3. Use `hasFeature()` (server) or `useFeatureFlag()` (client) to check
 *
 * Future extension: add a `feature_overrides` table for per-tenant toggles
 * and layer it into the evaluation engine.
 */

/** All feature flag keys — use this union for type safety */
export type FeatureKey =
  | "custom_domain"
  | "multi_language"
  | "analytics"
  | "custom_branding";

export type Plan = "basic" | "pro";

export interface FeatureDefinition {
  /** Human-readable description */
  description: string;
  /** Which plans unlock this feature */
  plans: Plan[];
  /** Default state if plan resolution fails (safe default = disabled) */
  defaultEnabled: boolean;
}

/**
 * Declarative feature definitions.
 *
 * Rule: if a feature's `plans` array includes the restaurant's plan,
 * the feature is enabled. Otherwise, it's disabled.
 */
export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  custom_domain: {
    description: "Özel alan adı desteği (örn. menu.kebabhouse.com)",
    plans: ["pro"],
    defaultEnabled: false,
  },
  multi_language: {
    description: "Çoklu dil desteği (menü çevirileri)",
    plans: ["pro"],
    defaultEnabled: false,
  },
  analytics: {
    description: "Detaylı görüntülenme ve etkileşim istatistikleri",
    plans: ["pro"],
    defaultEnabled: false,
  },
  custom_branding: {
    description: "Özel renk teması ve marka özelleştirmesi",
    plans: ["pro"],
    defaultEnabled: false,
  },
} as const;

/** Get all feature keys */
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

/** Get features available for a given plan */
export function getFeaturesForPlan(plan: Plan): FeatureKey[] {
  return FEATURE_KEYS.filter((key) => FEATURES[key].plans.includes(plan));
}
