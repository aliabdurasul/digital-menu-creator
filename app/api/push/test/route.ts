import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/test — Send a test push notification (admin-only).
 * Body: { customerKey: string, restaurantId: string }
 */
export async function POST(req: NextRequest) {
  // Auth gate: only authenticated admins can send test pushes
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Kimlik doğrulaması gerekli" }, { status: 401 });
  }

  try {
    const { customerKey, restaurantId } = (await req.json()) as {
      customerKey?: string;
      restaurantId?: string;
    };

    if (!customerKey || !restaurantId) {
      return NextResponse.json(
        { error: "customerKey and restaurantId required" },
        { status: 400 }
      );
    }

    const sent = await sendPush(customerKey, restaurantId, {
      title: "🔔 Test Bildirimi",
      body: "Push notification sistemi çalışıyor!",
      tag: "push-test",
    });

    return NextResponse.json({ sent });
  } catch (err) {
    console.error("[push/test] Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
