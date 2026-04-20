import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = ["pwa_install", "social_share", "review", "referral_bonus", "referee_bonus", "order_bonus"] as const;
type ActionType = typeof VALID_ACTIONS[number];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/loyalty/points
 * Body: { customerKey, restaurantId, actionType, meta? }
 * Earns points for the given action.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerKey, restaurantId, actionType, meta } = body as {
    customerKey?: string;
    restaurantId?: string;
    actionType?: string;
    meta?: Record<string, unknown>;
  };

  if (!customerKey || !restaurantId || !actionType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!UUID_RE.test(restaurantId) || !UUID_RE.test(customerKey)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(actionType as ActionType)) {
    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Get program to check points_enabled and configured values
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("points_enabled, pwa_install_points, social_share_points, review_points, referral_points, referee_bonus_points, order_points_per_item")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program?.points_enabled) {
    return NextResponse.json({ error: "Points system not enabled" }, { status: 400 });
  }

  // Map action to configured point value
  const pointMap: Record<ActionType, number> = {
    pwa_install: program.pwa_install_points ?? 50,
    social_share: program.social_share_points ?? 20,
    review: program.review_points ?? 30,
    referral_bonus: program.referral_points ?? 100,
    referee_bonus: program.referee_bonus_points ?? 50,
    order_bonus: program.order_points_per_item ?? 10,
  };

  const points = pointMap[actionType as ActionType];
  if (points <= 0) {
    return NextResponse.json({ error: "Action disabled" }, { status: 400 });
  }

  // For one-time actions, the unique index will prevent duplicates
  const { data, error } = await supabase
    .from("point_actions")
    .insert({
      customer_key: customerKey,
      restaurant_id: restaurantId,
      action_type: actionType,
      points,
      meta: meta ?? {},
    })
    .select("id, points, action_type, created_at")
    .single();

  if (error) {
    // Duplicate one-time action
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already earned", alreadyClaimed: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to record points" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: data });
}
