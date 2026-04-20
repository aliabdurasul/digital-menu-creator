import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/loyalty/store/redeem
 * Body: { customerKey, restaurantId, storeItemId }
 * Redeems a store item with points.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerKey, restaurantId, storeItemId } = body as {
    customerKey?: string;
    restaurantId?: string;
    storeItemId?: string;
  };

  if (!customerKey || !restaurantId || !storeItemId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!UUID_RE.test(restaurantId) || !UUID_RE.test(customerKey) || !UUID_RE.test(storeItemId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Get store item
  const { data: item } = await supabase
    .from("point_store_items")
    .select("*")
    .eq("id", storeItemId)
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Check stock
  if (item.stock !== -1 && item.stock <= 0) {
    return NextResponse.json({ error: "Out of stock" }, { status: 400 });
  }

  // Calculate balance
  const { data: actions } = await supabase
    .from("point_actions")
    .select("points")
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId);

  const { data: redemptions } = await supabase
    .from("point_redemptions")
    .select("points_spent")
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId);

  const earned = (actions ?? []).reduce((s, a) => s + a.points, 0);
  const spent = (redemptions ?? []).reduce((s, r) => s + r.points_spent, 0);
  const balance = earned - spent;

  if (balance < item.cost_points) {
    return NextResponse.json({ error: "Insufficient points", balance, cost: item.cost_points }, { status: 400 });
  }

  // Create redemption
  const { data: redemption, error: redeemError } = await supabase
    .from("point_redemptions")
    .insert({
      customer_key: customerKey,
      restaurant_id: restaurantId,
      store_item_id: storeItemId,
      points_spent: item.cost_points,
      status: "pending",
    })
    .select("id, points_spent, status, created_at")
    .single();

  if (redeemError) {
    return NextResponse.json({ error: "Redemption failed" }, { status: 500 });
  }

  // Decrease stock if not unlimited
  if (item.stock !== -1) {
    await supabase
      .from("point_store_items")
      .update({ stock: item.stock - 1 })
      .eq("id", storeItemId);
  }

  return NextResponse.json({
    ok: true,
    redemption,
    newBalance: balance - item.cost_points,
  });
}
