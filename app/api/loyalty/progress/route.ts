import { NextRequest, NextResponse } from "next/server";
import { getLoyaltySnapshot } from "@/lib/loyalty";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Validate UUID format — prevents DB queries with arbitrary strings
  if (!UUID_RE.test(restaurantId) || !UUID_RE.test(customerKey)) {
    return NextResponse.json({ error: "Geçersiz kimlik formatı" }, { status: 400 });
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
