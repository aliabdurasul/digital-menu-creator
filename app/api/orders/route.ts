import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/orders — Create a new order (public, no auth required).
 * Body: { restaurantId, tableId, items: [{ menuItemId, quantity }], note? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, tableId, items, note, sessionId } = body as {
      restaurantId?: string;
      tableId?: string;
      items?: { menuItemId: string; quantity: number }[];
      note?: string;
      sessionId?: string;
    };

    // Validate required fields
    if (!restaurantId || !tableId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "restaurantId, tableId ve en az 1 ürün gerekli" },
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

    const supabase = createClient();

    // 1. Verify table exists & is active for this restaurant
    const { data: table, error: tableErr } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, status")
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

    // 2. Fetch menu items to snapshot current prices
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

    // 3. Calculate total from snapshot prices
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

    // 4. Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        session_id: sessionId || "",
        source: "qr",
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

    // 5. Insert order items
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
