import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** POST /api/campaigns/preview — count recipients for a segment */
export async function POST(req: NextRequest) {
  const { restaurantId, segment } = await req.json();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  let query = supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("consent_given", true);

  switch (segment) {
    case "new":
      query = query.eq("total_orders", 1);
      break;
    case "loyal":
      query = query.gte("total_orders", 5);
      break;
    case "inactive": {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("last_visit", thirtyDaysAgo);
      break;
    }
    case "vip":
      query = query.eq("loyalty_tier", "vip");
      break;
  }

  const { count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count || 0 });
}
