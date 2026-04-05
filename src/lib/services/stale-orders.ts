/**
 * Auto-cancel orders stuck in "pending" for over 2 hours.
 * Multi-tenant: processes all restaurants in a single pass.
 */
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function processStaleOrders(): Promise<{ cancelled: number }> {
  const supabase = getServiceClient();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("created_at", twoHoursAgo)
    .select("id");

  if (error) {
    console.error("[stale-orders] Error:", error.message);
    return { cancelled: 0 };
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[stale-orders] Cancelled ${count} stale orders`);
  }

  return { cancelled: count };
}
