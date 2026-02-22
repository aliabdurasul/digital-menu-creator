/**
 * Feature flags module — public API.
 */

// Definitions
export { FEATURES, FEATURE_KEYS, getFeaturesForPlan } from "./flags";
export type { FeatureKey, Plan, FeatureDefinition } from "./flags";

// Engine
export { evaluateFeature, evaluateAllFeatures } from "./engine";
export type { FeatureEvaluationContext } from "./engine";

// Server helpers
export { hasFeature, getAllFeatures, hasFeatureForPlan } from "./server";

// Client hooks & provider (re-exported for convenience)
export { FeatureFlagProvider, useFeatureFlag, useFeatureFlags } from "./hooks";
