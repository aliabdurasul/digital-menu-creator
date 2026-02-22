/**
 * Server-side feature flag helpers.
 *
 * Use these in Server Components and Server Actions to check
 * whether a feature is enabled for a restaurant.
 */

import { createClient } from "@/lib/supabase/server";
import { evaluateFeature, evaluateAllFeatures } from "./engine";
import type { FeatureKey, Plan } from "./flags";

/**
 * Check if a feature is enabled for a specific restaurant.
 *
 * @param restaurantId - The restaurant's UUID
 * @param featureKey   - The feature to check
 * @returns Whether the feature is enabled
 *
 * @example
 *   // In a Server Component or Server Action:
 *   const canUseDomain = await hasFeature(restaurant.id, "custom_domain");
 */
export async function hasFeature(
  restaurantId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const plan = await getRestaurantPlan(restaurantId);
  if (!plan) return false;

  return evaluateFeature(featureKey, { plan });
}

/**
 * Get all feature flags for a restaurant.
 * Useful for passing the full feature map to client components via props.
 *
 * @param restaurantId - The restaurant's UUID
 * @returns Record of feature key → enabled boolean, or null if restaurant not found
 */
export async function getAllFeatures(
  restaurantId: string
): Promise<Record<FeatureKey, boolean> | null> {
  const plan = await getRestaurantPlan(restaurantId);
  if (!plan) return null;

  return evaluateAllFeatures({ plan });
}

/**
 * Check a feature using a known plan (no DB query).
 * Use when you already have the restaurant's plan in scope.
 */
export function hasFeatureForPlan(
  plan: Plan,
  featureKey: FeatureKey
): boolean {
  return evaluateFeature(featureKey, { plan });
}

/* ─── Internal ─── */

async function getRestaurantPlan(
  restaurantId: string
): Promise<Plan | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("plan")
      .eq("id", restaurantId)
      .single();

    if (error || !data) return null;
    return data.plan as Plan;
  } catch {
    return null;
  }
}
