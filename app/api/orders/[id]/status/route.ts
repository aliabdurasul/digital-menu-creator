import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types";
import { sendNotification, renderTemplate } from "@/lib/notifications";
import { processLoyaltyStamp } from "@/lib/loyalty";

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
      .select("id, status, restaurant_id, customer_id, customer_phone, total")
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

    // 6. Post-update actions (non-blocking)
    const postActions = async () => {
      try {
        // Get restaurant notification settings
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("notification_enabled, notification_channel")
          .eq("id", order.restaurant_id)
          .single();

        const phone = order.customer_phone;

        // When order is READY → send notification
        if (newStatus === "ready" && phone && restaurant?.notification_enabled) {
          const channel = restaurant.notification_channel === "both"
            ? "sms"
            : restaurant.notification_channel || "sms";

          await sendNotification({
            restaurantId: order.restaurant_id,
            customerId: order.customer_id || undefined,
            orderId: order.id,
            type: "order_ready",
            channel: channel as "sms" | "whatsapp",
            phone,
            message: `Siparişiniz hazır! 🎉 Lütfen teslim alın.`,
          });
        }

        // When order is DELIVERED → process loyalty
        if (newStatus === "delivered" && order.customer_id) {
          await processLoyaltyStamp(
            order.restaurant_id,
            order.customer_id,
            order.id,
            Number(order.total) || 0
          );
        }
      } catch (err) {
        console.error("[order-status] Post-update actions failed:", err);
      }
    };

    // Fire and forget — don't block the response
    postActions();

    return NextResponse.json({ success: true, status: newStatus });
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
