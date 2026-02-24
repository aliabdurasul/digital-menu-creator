export { type FeatureKey, type PlanType, type FeatureDef, FEATURE_MAP, getFeaturesForPlan } from "./flags";
export { canUseFeature, getAvailableFeatures, requiresPro } from "./engine";
export { checkFeatureServer } from "./server";

// Client-only exports — import directly from ./hooks in client components:
// import { useFeatureGate, ProBadge, UpgradePrompt, FeatureGate } from "@/lib/features/hooks";
