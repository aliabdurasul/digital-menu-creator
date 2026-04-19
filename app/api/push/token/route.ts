import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushDirect } from "@/lib/push";

// UUID v4 pattern — enforced to prevent arbitrary strings being stored as tokens
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const { customerKey, restaurantId, token, sendWelcome } = body as {
      customerKey?: string;
      restaurantId?: string;
      token?: string;
      sendWelcome?: boolean;
    };

    if (!customerKey || !restaurantId || !token) {
      return NextResponse.json(
        { error: "customerKey, restaurantId ve token gerekli" },
        { status: 400 }
      );
    }

    // Validate UUIDs and FCM token length to prevent abuse
    if (!UUID_RE.test(customerKey) || !UUID_RE.test(restaurantId)) {
      return NextResponse.json({ error: "Geçersiz kimlik" }, { status: 400 });
    }
    if (token.length < 32 || token.length > 512) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
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

    // Send welcome push to confirm notifications work (non-blocking)
    if (sendWelcome && token) {
      sendPushDirect(token, {
        title: "Bildirimler Açık! 🔔",
        body: "Siparişin hazır olduğunda seni haberdar edeceğiz.",
        tag: "push-welcome",
      }).catch(() => {/* non-critical */});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
