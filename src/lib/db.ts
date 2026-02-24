import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/types";

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
    return toRestaurant(rest, categories || [], menu_items || []);
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
    return restaurants.map((r) => toRestaurant(r, [], []));
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
    return toRestaurant(newRestaurant, [], []);
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

/* ─── Helpers ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRestaurant(r: any, categories: any[], items: any[]): Restaurant {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description || "",
    phone: r.phone || "",
    address: r.address || "",
    logo: r.logo_url || "",
    coverImage: r.cover_image_url || "",
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
    })),
    products: items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description || "",
      price: i.price,
      image: i.image_url || "",
      categoryId: i.category_id,
      available: i.is_available ?? true,
      order: i.order,
      ingredients: i.ingredients || "",
      portionInfo: i.portion_info || "",
      allergenInfo: i.allergen_info || "",
    })),
    plan: r.plan || "basic",
    active: r.active ?? true,
    menuStatus: r.menu_status || "active",
    totalViews: r.total_views || 0,
  };
}
