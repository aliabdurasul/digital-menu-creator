import { NextRequest, NextResponse } from "next/server";
import { getLoyaltySnapshot } from "@/lib/loyalty";

/**
 * GET /api/loyalty/progress?restaurantId=xxx&customerKey=xxx
 * Public endpoint — returns loyalty progress for a customer_key.
 * Used by LoyaltyProvider on menu page load.
 */
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const customerKey = req.nextUrl.searchParams.get("customerKey");

  if (!restaurantId || !customerKey) {
    return NextResponse.json(
      { error: "restaurantId ve customerKey gerekli" },
      { status: 400 }
    );
  }

  // Basic input validation
  if (restaurantId.length > 50 || customerKey.length > 50) {
    return NextResponse.json(
      { error: "Geçersiz parametre" },
      { status: 400 }
    );
  }

  try {
    const result = await getLoyaltySnapshot(restaurantId, customerKey);

    if (!result) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
