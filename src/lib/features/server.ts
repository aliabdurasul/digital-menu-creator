import { createClient } from "@/lib/supabase/server";
import { canUseFeature } from "./engine";
import type { FeatureKey } from "./flags";

/**
 * Server-side feature check that queries the restaurant's actual plan from DB.
 * Use this in server actions / API routes for authoritative gating.
 */
export async function checkFeatureServer(
  restaurantId: string,
  feature: FeatureKey
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("plan, active")
      .eq("id", restaurantId)
      .single();

    if (error || !data) return false;
    if (!data.active) return false;

    return canUseFeature(data.plan, feature);
  } catch {
    return false;
  }
}
