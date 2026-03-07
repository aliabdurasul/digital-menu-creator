import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/types";
import { toLegacyRestaurant } from "@/types";

/**
 * Data access layer — all data from Supabase only.
 * If a query fails the function returns null / empty array.
 */

/* ─── Public Queries ─── */

/** Fetch a restaurant by slug (public — no auth required) */
export async function getRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  try {
    const supabase = createClient();

    // Single query: fetch restaurant with categories + items via Supabase joins
    const { data: dbRestaurant, error } = await supabase
      .from("restaurants")
      .select(`
        *,
        categories ( id, restaurant_id, name, "order", created_at ),
        menu_items ( id, restaurant_id, category_id, name, description, price, image_url, is_available, "order", ingredients, portion_info, allergen_info, created_at, updated_at )
      `)
      .eq("slug", slug)
      .single();

    if (error || !dbRestaurant) throw new Error("Not found");

    const { categories, menu_items, ...rest } = dbRestaurant;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return toLegacyRestaurant(rest as any, categories || [], menu_items || []);
  } catch {
    return null;
  }
}

/**
 * Fetch a restaurant by slug with translations merged for a given language.
 * Falls back to base (Turkish) content when no translation exists.
 */
export async function getRestaurantBySlugTranslated(
  slug: string,
  language: string
): Promise<Restaurant | null> {
  // If language is Turkish, no translation needed
  if (language === "tr") return getRestaurantBySlug(slug);

  try {
    const supabase = createClient();

    // Fetch restaurant + base data + translations in one query
    const { data: dbRestaurant, error } = await supabase
      .from("restaurants")
      .select(`
        *,
        categories ( id, restaurant_id, name, "order", created_at ),
        menu_items ( id, restaurant_id, category_id, name, description, price, image_url, is_available, "order", ingredients, portion_info, allergen_info, created_at, updated_at ),
        restaurant_translations ( language, name, description )
      `)
      .eq("slug", slug)
      .single();

    if (error || !dbRestaurant) throw new Error("Not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = dbRestaurant as any;
    const categories = raw.categories || [];
    const menuItems = raw.menu_items || [];
    const catIds = categories.map((c: any) => c.id);
    const itemIds = menuItems.map((i: any) => i.id);

    // Fetch category + menu item translations separately (simpler than nested joins)
    const [catTransRes, itemTransRes] = await Promise.all([
      catIds.length > 0
        ? supabase
            .from("category_translations")
            .select("category_id, name")
            .in("category_id", catIds)
            .eq("language", language)
        : { data: [] },
      itemIds.length > 0
        ? supabase
            .from("menu_item_translations")
            .select("menu_item_id, name, description, ingredients, portion_info, allergen_info")
            .in("menu_item_id", itemIds)
            .eq("language", language)
        : { data: [] },
    ]);

    // Build lookup maps
    const catTransMap = new Map<string, string>();
    for (const ct of (catTransRes.data || []) as any[]) {
      if (ct.name) catTransMap.set(ct.category_id, ct.name);
    }

    const itemTransMap = new Map<string, Record<string, string>>();
    for (const mt of (itemTransRes.data || []) as any[]) {
      itemTransMap.set(mt.menu_item_id, mt);
    }

    // Find restaurant-level translation
    const rTrans = (raw.restaurant_translations || []).find(
      (t: { language: string }) => t.language === language
    );

    // Merge translations over base data
    const { categories: _c, menu_items: _m, restaurant_translations: _rt, ...restFields } = raw;
    if (rTrans) {
      if (rTrans.name) restFields.name = rTrans.name;
      if (rTrans.description) restFields.description = rTrans.description;
    }

    const translatedCategories = categories.map((c: any) => ({
      ...c,
      name: catTransMap.get(c.id) || c.name,
    }));

    const translatedItems = menuItems.map((i: any) => {
      const t = itemTransMap.get(i.id);
      if (!t) return i;
      return {
        ...i,
        name: t.name || i.name,
        description: t.description || i.description,
        ingredients: t.ingredients || i.ingredients,
        portion_info: t.portion_info || i.portion_info,
        allergen_info: t.allergen_info || i.allergen_info,
      };
    });

    return toLegacyRestaurant(restFields, translatedCategories, translatedItems);
  } catch {
    return null;
  }
}

/** Fetch all restaurants (super admin) */
export async function getAllRestaurants(): Promise<Restaurant[]> {
  try {
    const supabase = createClient();

    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !restaurants) throw new Error("Query failed");

    // For list views we don't need full categories/products
    return restaurants.map((r) => toLegacyRestaurant(r as any, [], []));
  } catch {
    return [];
  }
}

/* ─── Restaurant Mutations ─── */

export async function createRestaurant(data: {
  name: string;
  slug: string;
}): Promise<Restaurant | null> {
  try {
    const supabase = createClient();

    const { data: newRestaurant, error } = await supabase
      .from("restaurants")
      .insert({
        name: data.name,
        slug: data.slug,
        logo_url: "",
        cover_image_url: "",
        plan: "basic",
        active: true,
        total_views: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return toLegacyRestaurant(newRestaurant as any, [], []);
  } catch {
    return null;
  }
}

export async function updateRestaurant(
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("restaurants")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteRestaurant(id: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // Delete in order: menu_items → categories → restaurant
    await supabase.from("menu_items").delete().eq("restaurant_id", id);
    await supabase.from("categories").delete().eq("restaurant_id", id);
    const { error } = await supabase.from("restaurants").delete().eq("id", id);

    return !error;
  } catch {
    return false;
  }
}

/* ─── Category Mutations ─── */

export async function createCategory(data: {
  restaurant_id: string;
  name: string;
  order: number;
}): Promise<string | null> {
  try {
    const supabase = createClient();

    const { data: row, error } = await supabase
      .from("categories")
      .insert(data)
      .select("id")
      .single();

    if (error) throw error;
    return row.id;
  } catch {
    return null;
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // menu_items.category_id is ON DELETE SET NULL — products become uncategorized
    const { error } = await supabase.from("categories").delete().eq("id", id);

    return !error;
  } catch {
    return false;
  }
}

/* ─── Menu Item Mutations ─── */

export async function createMenuItem(data: {
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  order: number;
}): Promise<string | null> {
  try {
    const supabase = createClient();

    const { data: row, error } = await supabase
      .from("menu_items")
      .insert(data)
      .select("id")
      .single();

    if (error) throw error;
    return row.id;
  } catch {
    return null;
  }
}

export async function updateMenuItem(
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("menu_items")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function toggleMenuItemAvailability(
  id: string,
  isAvailable: boolean
): Promise<boolean> {
  return updateMenuItem(id, { is_available: isAvailable });
}

/* ─── Table Queries ─── */

export async function getTableById(tableId: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("id", tableId)
      .single();
    if (error || !data) return null;
    return data as import("@/types").DbTable;
  } catch {
    return null;
  }
}

export async function getTablesByRestaurant(restaurantId: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("label");
    if (error) return [];
    return (data || []) as import("@/types").DbTable[];
  } catch {
    return [];
  }
}

/* ─── Order Queries ─── */

export async function getOrdersByRestaurant(restaurantId: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*), restaurant_tables(label)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((o: Record<string, unknown>) => ({
      ...o,
      items: o.order_items || [],
      table: o.restaurant_tables || undefined,
    })) as import("@/types").OrderWithItems[];
  } catch {
    return [];
  }
}
