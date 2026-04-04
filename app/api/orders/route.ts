import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { restaurantId, tableId, items, note, sessionId, customerPhone, customerName } = body as {
      restaurantId?: string;
      tableId?: string | null;
      items?: { menuItemId: string; quantity: number }[];
      note?: string;
      sessionId?: string;
      customerPhone?: string;
      customerName?: string;
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

    // 3. Fetch menu items to snapshot current prices
    const menuItemIds = items.map((i) => i.menuItemId);
    const { data: menuItems, error: miErr } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
      .in("id", menuItemIds)
      .eq("restaurant_id", restaurantId);

    if (miErr || !menuItems || menuItems.length === 0) {
      return NextResponse.json(
        { error: "Ürünler bulunamadı" },
        { status: 404 }
      );
    }

    // Build lookup map
    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Check all items exist and are available
    for (const item of items) {
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

    // 4. Calculate total from snapshot prices
    let total = 0;
    const orderItems = items.map((item) => {
      const mi = itemMap.get(item.menuItemId)!;
      total += mi.price * item.quantity;
      return {
        menu_item_id: mi.id,
        name_snapshot: mi.name,
        price_snapshot: mi.price,
        quantity: item.quantity,
      };
    });

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

    // 5. Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId || null,
        session_id: sessionId || "",
        customer_id: customerId,
        customer_phone: customerPhone || null,
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

    return NextResponse.json({ orderId: order.id, total }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
