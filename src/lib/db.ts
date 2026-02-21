import { createClient } from "@/lib/supabase/server";
import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";

/**
 * Data access layer — Supabase queries with mock fallback.
 *
 * Each function attempts a real Supabase query first.
 * If the table doesn't exist or query fails, it falls back to mockData.
 * This ensures the app works before DB tables are created.
 *
 * TODO: Remove all mock fallbacks when DB is fully set up.
 */

/* ─── Public Queries ─── */

/** Fetch a restaurant by slug (public — no auth required) */
export async function getRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  try {
    const supabase = createClient();

    const { data: dbRestaurant, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !dbRestaurant) throw new Error("Not found");

    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", dbRestaurant.id)
      .order("order");

    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", dbRestaurant.id)
      .order("order");

    return toRestaurant(dbRestaurant, categories || [], items || []);
  } catch {
    // TODO: Remove mock fallback when DB is ready
    return mockRestaurants.find((r) => r.slug === slug) || null;
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
    // TODO: Remove mock fallback when DB is ready
    return mockRestaurants.map((r) => ({ ...r }));
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
    // TODO: Remove mock fallback when DB is ready
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

    // Delete menu items in this category first
    await supabase.from("menu_items").delete().eq("category_id", id);
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
    })),
    plan: r.plan || "basic",
    active: r.active ?? true,
    totalViews: r.total_views || 0,
  };
}
