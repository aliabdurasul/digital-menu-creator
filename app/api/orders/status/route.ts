import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS so anonymous customers can poll their order status.
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

/**
 * GET /api/orders/status?sessionId=CAFE-XXXXX
 * Public endpoint — returns the latest order status for a given session ID.
 * Used by cafe customers to poll for "ready" status.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId || sessionId.length > 20) {
    return NextResponse.json({ error: "Geçersiz sessionId" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("orders")
      .select("status, loyalty_stamp_count, loyalty_stamps_needed, loyalty_reward_earned, loyalty_reward_message")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({
      status: data.status,
      loyalty_stamp_count: data.loyalty_stamp_count,
      loyalty_stamps_needed: data.loyalty_stamps_needed,
      loyalty_reward_earned: data.loyalty_reward_earned,
      loyalty_reward_message: data.loyalty_reward_message,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
