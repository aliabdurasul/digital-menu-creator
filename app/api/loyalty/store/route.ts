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
 * GET /api/loyalty/store?restaurantId=xxx
 * Returns active point store items for this restaurant.
 */
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId || !UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: "Invalid restaurantId" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("point_store_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch store" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

/**
 * POST /api/loyalty/store
 * Admin endpoint — create/update a store item.
 * Body: { restaurantId, item: { id?, name, description, image_url, cost_points, menu_item_id?, stock, active, sort_order } }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { restaurantId, item } = body as {
    restaurantId?: string;
    item?: {
      id?: string;
      name?: string;
      description?: string;
      image_url?: string;
      cost_points?: number;
      menu_item_id?: string | null;
      stock?: number;
      active?: boolean;
      sort_order?: number;
    };
  };

  if (!restaurantId || !UUID_RE.test(restaurantId) || !item?.name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const payload = {
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description ?? "",
    image_url: item.image_url ?? "",
    cost_points: item.cost_points ?? 100,
    menu_item_id: item.menu_item_id || null,
    stock: item.stock ?? -1,
    active: item.active ?? true,
    sort_order: item.sort_order ?? 0,
  };

  if (item.id) {
    const { data, error } = await supabase
      .from("point_store_items")
      .update(payload)
      .eq("id", item.id)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json({ item: data });
  }

  const { data, error } = await supabase
    .from("point_store_items")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  return NextResponse.json({ item: data });
}

/**
 * DELETE /api/loyalty/store?id=xxx&restaurantId=xxx
 * Admin — soft delete (set active=false).
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");

  if (!id || !restaurantId || !UUID_RE.test(id) || !UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("point_store_items")
    .update({ active: false })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
