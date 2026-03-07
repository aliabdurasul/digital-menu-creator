import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types";

/** Valid status transitions */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

/**
 * PATCH /api/orders/[id]/status — Update order status (admin only).
 * Body: { status: OrderStatus }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json();
    const { status: newStatus } = body as { status?: OrderStatus };

    if (!newStatus) {
      return NextResponse.json(
        { error: "status alanı gerekli" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Kimlik doğrulanmadı" },
        { status: 401 }
      );
    }

    // 2. Get order + check ownership
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, restaurant_id")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // 3. Verify admin owns this restaurant
    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.restaurant_id !== order.restaurant_id) {
      return NextResponse.json(
        { error: "Bu siparişe erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    // 4. Validate transition
    const current = order.status as OrderStatus;
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Geçersiz durum geçişi: ${current} → ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // 5. Update order status
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateErr) {
      return NextResponse.json(
        { error: "Güncelleme başarısız" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
