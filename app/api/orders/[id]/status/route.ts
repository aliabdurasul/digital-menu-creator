import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus, LoyaltyProgressResponse, LoyaltyResult } from "@/types";
import { sendNotification } from "@/lib/notifications";
import { processLoyaltyStamp, confirmProgress } from "@/lib/loyalty";
import { sendPush } from "@/lib/push";

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
      .select("id, status, restaurant_id, customer_id, customer_phone, customer_key, total")
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

    // 6. Post-update actions
    let loyaltyResult: LoyaltyProgressResponse | LoyaltyResult | undefined;

    // Get restaurant settings (needed for both ready and delivered actions)
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("notification_enabled, notification_channel, module_type")
      .eq("id", order.restaurant_id)
      .single();

    const phone = order.customer_phone;
    const isCafe = restaurant?.module_type === "cafe";

    // When order is READY → send SMS notification (non-blocking)
    if (newStatus === "ready" && phone && (isCafe || restaurant?.notification_enabled)) {
      sendNotification({
        restaurantId: order.restaurant_id,
        customerId: order.customer_id || undefined,
        orderId: order.id,
        type: "order_ready",
        channel: "sms",
        phone,
        message: `Siparişiniz hazır! 🎉 Lütfen teslim alın.`,
      }).catch((err) => console.error("[order-status] SMS notification failed:", err));
    }

    // When order is READY → send push notification (non-blocking)
    if (newStatus === "ready" && order.customer_key) {
      sendPush(order.customer_key, order.restaurant_id, {
        title: "Siparişiniz Hazır! 🎉",
        body: "Lütfen teslim alın.",
        tag: "order-ready",
        url: `/menu/${order.restaurant_id}`,
      }).catch((err) => console.error("[order-status] Push notification failed:", err));
    }

    // When order is DELIVERED → confirm loyalty progress (CAFE ONLY)
    if (newStatus === "delivered" && isCafe) {
      try {
        // New path: customer_key-based loyalty
        if (order.customer_key) {
          loyaltyResult = (await confirmProgress(
            order.restaurant_id,
            order.customer_key,
            order.id,
            Number(order.total) || 0
          )) ?? undefined;
        }
        // Legacy path: customer_id-based loyalty (old orders without customer_key)
        else if (order.customer_id) {
          loyaltyResult = await processLoyaltyStamp(
            order.restaurant_id,
            order.customer_id,
            order.id,
            Number(order.total) || 0
          );
        }
      } catch (err) {
        console.error("[order-status] Loyalty processing failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      ...(loyaltyResult ? { loyalty: loyaltyResult } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
