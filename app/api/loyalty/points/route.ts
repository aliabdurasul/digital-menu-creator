import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = ["pwa_install", "social_share", "review", "referral"] as const;
type ActionType = (typeof VALID_ACTIONS)[number];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/loyalty/points — Record a point-earning action.
 * Body: { customerKey, restaurantId, action }
 *
 * One-time actions (pwa_install, referral) are idempotent.
 * Returns the points earned and new total.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerKey, restaurantId, action } = body as {
      customerKey?: string;
      restaurantId?: string;
      action?: string;
    };

    if (!customerKey || !restaurantId || !action) {
      return NextResponse.json(
        { error: "customerKey, restaurantId ve action gerekli" },
        { status: 400 }
      );
    }

    if (!UUID_RE.test(customerKey) || !UUID_RE.test(restaurantId)) {
      return NextResponse.json({ error: "Geçersiz kimlik" }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(action as ActionType)) {
      return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Look up points config from loyalty_programs
    const { data: program } = await supabase
      .from("loyalty_programs")
      .select("points_enabled, pwa_install_points, social_share_points, review_points")
      .eq("restaurant_id", restaurantId)
      .single();

    if (!program?.points_enabled) {
      return NextResponse.json({ error: "Puan sistemi aktif değil" }, { status: 400 });
    }

    // Determine points for this action
    const pointsMap: Record<string, number> = {
      pwa_install: program.pwa_install_points ?? 50,
      social_share: program.social_share_points ?? 20,
      review: program.review_points ?? 30,
      referral: 50,
    };
    const points = pointsMap[action] || 0;

    if (points <= 0) {
      return NextResponse.json({ error: "Bu aksiyon için puan tanımlı değil" }, { status: 400 });
    }

    // Insert action (unique constraint handles idempotency for one-time actions)
    const { error } = await supabase.from("point_actions").insert({
      customer_key: customerKey,
      restaurant_id: restaurantId,
      action_type: action,
      points,
    });

    if (error) {
      // Unique constraint violation = already claimed
      if (error.code === "23505") {
        return NextResponse.json({ error: "Bu ödül zaten alındı", alreadyClaimed: true }, { status: 409 });
      }
      console.error("[loyalty/points] Insert failed:", error);
      return NextResponse.json({ error: "Puan kaydedilemedi" }, { status: 500 });
    }

    // Calculate new total
    const { data: totalData } = await supabase
      .from("point_actions")
      .select("points")
      .eq("customer_key", customerKey)
      .eq("restaurant_id", restaurantId);

    const total = (totalData || []).reduce((sum, row) => sum + (row.points || 0), 0);

    return NextResponse.json({ success: true, pointsEarned: points, totalPoints: total });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * GET /api/loyalty/points?customerKey=...&restaurantId=...
 * Returns the customer's total points and action history.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerKey = searchParams.get("customerKey");
  const restaurantId = searchParams.get("restaurantId");

  if (!customerKey || !restaurantId) {
    return NextResponse.json({ error: "customerKey ve restaurantId gerekli" }, { status: 400 });
  }

  if (!UUID_RE.test(customerKey) || !UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: "Geçersiz kimlik" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    const { data } = await supabase
      .from("point_actions")
      .select("action_type, points, created_at")
      .eq("customer_key", customerKey)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    const actions = data || [];
    const total = actions.reduce((sum, row) => sum + (row.points || 0), 0);

    return NextResponse.json({
      totalPoints: total,
      actions: actions.map((a) => ({
        action: a.action_type,
        points: a.points,
        date: a.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
