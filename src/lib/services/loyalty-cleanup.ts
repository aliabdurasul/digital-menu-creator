/**
 * Expire loyalty reward stamps older than 30 days that haven't been redeemed.
 * Multi-tenant: processes all restaurants in a single pass.
 */
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function processLoyaltyCleanup(): Promise<{ expired: number }> {
  const supabase = getServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("loyalty_stamps")
    .delete()
    .eq("is_reward", true)
    .lt("created_at", thirtyDaysAgo)
    .select("id");

  if (error) {
    console.error("[loyalty-cleanup] Error:", error.message);
    return { expired: 0 };
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[loyalty-cleanup] Expired ${count} old reward stamps`);
  }

  return { expired: count };
}
