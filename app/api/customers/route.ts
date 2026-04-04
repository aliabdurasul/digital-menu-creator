import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/customers?restaurantId=...&search=...&segment=...&page=1&limit=20 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const search = searchParams.get("search") || "";
  const segment = searchParams.get("segment") || "all";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("restaurant_id", restaurantId)
    .order("last_visit", { ascending: false });

  // Text search on name or phone
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  // Segment filters
  switch (segment) {
    case "new":
      query = query.eq("total_orders", 1);
      break;
    case "repeat":
      query = query.gte("total_orders", 5);
      break;
    case "inactive": {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("last_visit", thirtyDaysAgo);
      break;
    }
    case "recent": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("last_visit", sevenDaysAgo);
      break;
    }
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    customers: data || [],
    total: count || 0,
    page,
    limit,
  });
}

/** PATCH /api/customers  — update customer tags or name */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, tags } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (tags !== undefined) updates.tags = tags;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
