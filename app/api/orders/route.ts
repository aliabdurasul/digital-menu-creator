import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureCustomerAlias, addPendingProgress, consumeReward } from "@/lib/loyalty";
import type { LoyaltyProgressResponse } from "@/types";

/**
 * Service-role client — bypasses RLS so anonymous users can place orders.
 * All validation (active restaurant, active table, available items) is done
 * server-side in code before any writes.
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

/**
 * POST /api/orders — Create a new order (public, no auth required).
 * Body: { restaurantId, tableId?, items: [{ menuItemId, quantity }], note?, sessionId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, tableId, items, note, sessionId, customerPhone, customerName, customerKey } = body as {
      restaurantId?: string;
      tableId?: string | null;
      items?: { menuItemId: string; quantity: number; type?: "loyalty_reward" | "point_store_reward"; name?: string; redemptionId?: string }[];
      note?: string;
      sessionId?: string;
      customerPhone?: string;
      customerName?: string;
      customerKey?: string;
    };

    // Validate required fields
    if (!restaurantId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "restaurantId ve en az 1 ürün gerekli" },
        { status: 400 }
      );
    }

    // Validate quantities
    if (items.some((i) => !i.menuItemId || !i.quantity || i.quantity < 1)) {
      return NextResponse.json(
        { error: "Geçersiz ürün veya miktar" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 1. Verify restaurant is active
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, active, module_type")
      .eq("id", restaurantId)
      .eq("active", true)
      .single();

    if (restErr || !restaurant) {
      return NextResponse.json(
        { error: "Restoran bulunamadı veya aktif değil" },
        { status: 404 }
      );
    }

    // 2. If tableId provided, verify table exists & is active
    if (tableId) {
      const { data: table, error: tableErr } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("id", tableId)
        .eq("restaurant_id", restaurantId)
        .eq("status", "active")
        .single();

      if (tableErr || !table) {
        return NextResponse.json(
          { error: "Masa bulunamadı veya aktif değil" },
          { status: 404 }
        );
      }
    }

    // Separate regular items from loyalty reward and point store items
    const regularItems = items.filter((i) => !i.type);
    const rewardItems = items.filter((i) => i.type === "loyalty_reward");
    const storeRewardItems = items.filter((i) => i.type === "point_store_reward");

    // 3. Fetch menu items to snapshot current prices (regular items only)
    const menuItemIds = regularItems.map((i) => i.menuItemId);
    let menuItems: { id: string; name: string; price: number; is_available: boolean }[] = [];

    if (menuItemIds.length > 0) {
      const { data: miData, error: miErr } = await supabase
        .from("menu_items")
        .select("id, name, price, is_available")
        .in("id", menuItemIds)
        .eq("restaurant_id", restaurantId);

      if (miErr || !miData || miData.length === 0) {
        return NextResponse.json(
          { error: "Ürünler bulunamadı" },
          { status: 404 }
        );
      }
      menuItems = miData;
    }

    // Build lookup map
    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Check all regular items exist and are available
    for (const item of regularItems) {
      const mi = itemMap.get(item.menuItemId);
      if (!mi) {
        return NextResponse.json(
          { error: `Ürün bulunamadı: ${item.menuItemId}` },
          { status: 404 }
        );
      }
      if (!mi.is_available) {
        return NextResponse.json(
          { error: `Ürün şu anda mevcut değil: ${mi.name}` },
          { status: 400 }
        );
      }
    }

    // 3b. Validate loyalty reward items — customer must have pending rewards
    if (rewardItems.length > 0) {
      if (!customerKey) {
        return NextResponse.json(
          { error: "Sadakat ödülü için müşteri kimliği gerekli" },
          { status: 400 }
        );
      }

      // Only allow ONE reward item per order
      if (rewardItems.length > 1) {
        return NextResponse.json(
          { error: "Sipariş başına en fazla bir sadakat ödülü kullanılabilir" },
          { status: 400 }
        );
      }

      // Look up active loyalty program for this restaurant
      const { data: activeProgram } = await supabase
        .from("loyalty_programs")
        .select("id, reward_type, reward_item_id, reward_pool")
        .eq("restaurant_id", restaurantId)
        .eq("enabled", true)
        .single();

      // Check pending_rewards (falls back to reward_ready for pre-migration rows)
      const { data: custProgress } = activeProgram
        ? await supabase
            .from("loyalty_progress")
            .select("reward_ready, pending_rewards")
            .eq("program_id", activeProgram.id)
            .eq("customer_key", customerKey)
            .single()
        : { data: null };

      const pendingCount = custProgress?.pending_rewards ?? (custProgress?.reward_ready ? 1 : 0);
      if (pendingCount <= 0) {
        return NextResponse.json(
          { error: "Sadakat ödülünüz mevcut değil veya süresi dolmuş" },
          { status: 400 }
        );
      }

      // For free_item rewards, validate that the submitted item matches allowed items
      if (activeProgram && activeProgram.reward_type === "free_item") {
        const rewardItem = rewardItems[0];
        const rewardPool = (activeProgram.reward_pool ?? []) as Array<{ menuItemId?: string }>;
        const allowedIds = new Set<string>();
        if (activeProgram.reward_item_id) allowedIds.add(activeProgram.reward_item_id);
        for (const poolItem of rewardPool) {
          if (poolItem.menuItemId) allowedIds.add(poolItem.menuItemId);
        }
        // If specific items are configured, enforce them
        if (allowedIds.size > 0 && rewardItem.menuItemId) {
          if (!allowedIds.has(rewardItem.menuItemId)) {
            return NextResponse.json(
              { error: "Bu ürün sadakat ödülü olarak kullanılamaz" },
              { status: 400 }
            );
          }
        }
      }
    }

    // 4. Calculate total from snapshot prices
    let total = 0;
    const orderItems: {
      menu_item_id: string | null;
      name_snapshot: string;
      price_snapshot: number;
      quantity: number;
      is_loyalty_reward: boolean;
    }[] = [];

    // Add regular items
    for (const item of regularItems) {
      const mi = itemMap.get(item.menuItemId)!;
      total += mi.price * item.quantity;
      orderItems.push({
        menu_item_id: mi.id,
        name_snapshot: mi.name,
        price_snapshot: mi.price,
        quantity: item.quantity,
        is_loyalty_reward: false,
      });
    }

    // Add loyalty reward items (price: 0)
    for (const item of rewardItems) {
      orderItems.push({
        menu_item_id: item.menuItemId || null,
        name_snapshot: item.name || "Sadakat Ödülü",
        price_snapshot: 0,
        quantity: item.quantity,
        is_loyalty_reward: true,
      });
    }

    // Add point store reward items (price: 0)
    for (const item of storeRewardItems) {
      orderItems.push({
        menu_item_id: item.menuItemId || null,
        name_snapshot: item.name || "Puan Ödülü",
        price_snapshot: 0,
        quantity: item.quantity,
        is_loyalty_reward: true,
      });
    }

    // 4b. Find or create customer if phone provided
    let customerId: string | null = null;
    if (customerPhone) {
      // Upsert: find existing or create new
      const { data: existing } = await supabase
        .from("customers")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .eq("phone", customerPhone)
        .single();

      if (existing) {
        customerId = existing.id;
        // Update name if it was blank and now provided
        if (customerName && !existing.name) {
          await supabase.from("customers").update({ name: customerName }).eq("id", existing.id);
        }
      } else {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            restaurant_id: restaurantId,
            phone: customerPhone,
            name: customerName || "",
            source: tableId ? "qr" : "qr",
            module_type: restaurant.module_type || "restaurant",
            consent_given: true,
            consent_date: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (newCustomer) customerId = newCustomer.id;
      }
    }

    // 4c. Ensure customer alias if customerKey provided
    if (customerKey) {
      await ensureCustomerAlias(restaurantId, customerKey, customerPhone || undefined);
    }

    // 5. Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId || null,
        session_id: sessionId || "",
        customer_id: customerId,
        customer_phone: customerPhone || null,
        customer_key: customerKey || null,
        source: tableId ? "qr" : "takeaway",
        note: note || "",
        total: Math.round(total * 100) / 100,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Sipariş oluşturulamadı" },
        { status: 500 }
      );
    }

    // 6. Insert order items
    const { error: oiErr } = await supabase.from("order_items").insert(
      orderItems.map((oi) => ({
        ...oi,
        order_id: order.id,
      }))
    );

    if (oiErr) {
      // Rollback order if items fail
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Sipariş kalemleri eklenemedi" },
        { status: 500 }
      );
    }

    // 7. Consume loyalty reward if reward items were included
    if (rewardItems.length > 0 && customerKey) {
      try {
        await consumeReward(restaurantId, customerKey);
      } catch {
        // Non-critical — reward may already be consumed
      }
    }

    // 7b. Link point store redemptions to this order
    for (const item of storeRewardItems) {
      if (item.redemptionId) {
        await supabase
          .from("point_redemptions")
          .update({ order_id: order.id, status: "used" })
          .eq("id", item.redemptionId)
          .eq("customer_key", customerKey);
      }
    }

    // 8. If cafe with customerKey, process optimistic loyalty progress
    //    Skip progress for reward-only orders (no paid items → no stamp).
    let loyalty: LoyaltyProgressResponse | undefined;
    const isCafe = restaurant.module_type === "cafe";
    const hasPaidItems = regularItems.length > 0;
    if (isCafe && customerKey && hasPaidItems) {
      try {
        const result = await addPendingProgress(
          restaurantId,
          customerKey,
          order.id,
          Math.round(total * 100) / 100
        );
        if (result) loyalty = result;
      } catch {
        // Non-critical — skip loyalty info
      }
    } else if (isCafe && customerKey && !hasPaidItems) {
      // Reward-only order: just refetch progress so the frontend sees updated pending_rewards
      try {
        const { getLoyaltySnapshot } = await import("@/lib/loyalty");
        loyalty = await getLoyaltySnapshot(restaurantId, customerKey) ?? undefined;
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json(
      { orderId: order.id, total, ...(loyalty ? { loyalty } : {}) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
