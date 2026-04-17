import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/push/token — Save or update an FCM push token.
 * Body: { customerKey: string, restaurantId: string, token: string }
 *
 * No auth required — session-based identity (customer_key from client).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerKey, restaurantId, token } = body as {
      customerKey?: string;
      restaurantId?: string;
      token?: string;
    };

    if (!customerKey || !restaurantId || !token) {
      return NextResponse.json(
        { error: "customerKey, restaurantId ve token gerekli" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Upsert: one token per customer per restaurant
    const { error } = await supabase.from("push_tokens").upsert(
      {
        customer_key: customerKey,
        restaurant_id: restaurantId,
        token,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "customer_key,restaurant_id",
      }
    );

    if (error) {
      console.error("[push/token] Upsert failed:", error);
      return NextResponse.json(
        { error: "Token kaydedilemedi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
