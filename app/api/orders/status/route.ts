import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLoyaltySnapshot } from "@/lib/loyalty";
import type { LoyaltyProgressResponse } from "@/types";

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
 * Includes loyalty progress from loyalty_progress table if customer_key present.
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
      .select("status, customer_key, restaurant_id, loyalty_stamp_count, loyalty_stamps_needed, loyalty_reward_earned, loyalty_reward_message")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "pending" });
    }

    // Fetch rich loyalty progress if customer_key exists
    let loyaltyProgress: LoyaltyProgressResponse | null = null;
    if (data.customer_key && data.restaurant_id) {
      try {
        loyaltyProgress = await getLoyaltySnapshot(data.restaurant_id, data.customer_key);
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      status: data.status,
      // Legacy fields (backward compat)
      loyalty_stamp_count: data.loyalty_stamp_count,
      loyalty_stamps_needed: data.loyalty_stamps_needed,
      loyalty_reward_earned: data.loyalty_reward_earned,
      loyalty_reward_message: data.loyalty_reward_message,
      // New rich loyalty data
      ...(loyaltyProgress ? { loyalty: loyaltyProgress } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
