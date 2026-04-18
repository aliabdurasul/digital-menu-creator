import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/lib/push";

/**
 * POST /api/push/test — Send a test push notification.
 * Body: { customerKey: string, restaurantId: string }
 *
 * For debugging only. In production, gate behind admin auth.
 */
export async function POST(req: NextRequest) {
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
