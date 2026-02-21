import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";
import type { Restaurant } from "@/types";

/**
 * Server-side auth helpers — Supabase only (no mock fallback).
 */

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  restaurantId: string | null;
}

/**
 * Get the currently authenticated user from Supabase session.
 * Falls back to null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    // Fetch profile for role and restaurant_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // Profile table might not exist yet — user is authenticated but no role
      // Return a default that will be rejected by role checks
      return {
        id: user.id,
        email: user.email || "",
        role: "restaurant_admin",
        restaurantId: null,
      };
    }

    return {
      id: user.id,
      email: user.email || "",
      role: profile.role as UserRole,
      restaurantId: profile.restaurant_id,
    };
  } catch {
    // Supabase not configured or network error — return null
    return null;
  }
}

/**
 * Get the restaurant for the current authenticated admin user.
 * Queries Supabase first, falls back to mock data if DB not ready.
 */
export async function getCurrentRestaurant(): Promise<Restaurant | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const supabase = createClient();

    // Try fetching from real DB first
    if (user.restaurantId) {
      const { data: dbRestaurant } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", user.restaurantId)
        .single();

      if (dbRestaurant) {
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

        // Convert to legacy format for UI compatibility
        return {
          id: dbRestaurant.id,
          slug: dbRestaurant.slug,
          name: dbRestaurant.name,
          logo: dbRestaurant.logo_url || "",
          coverImage: dbRestaurant.cover_image_url || "",
          categories: (categories || []).map((c: { id: string; name: string; order: number }) => ({
            id: c.id,
            name: c.name,
            order: c.order,
          })),
          products: (items || []).map((i: { id: string; name: string; description: string; price: number; image_url: string; category_id: string; is_available: boolean; order: number }) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price,
            image: i.image_url || "",
            categoryId: i.category_id,
            available: i.is_available,
            order: i.order,
          })),
          plan: dbRestaurant.plan || "basic",
          active: dbRestaurant.active ?? true,
          totalViews: dbRestaurant.total_views || 0,
        };
      }
    }
  } catch {
    // Supabase query failed
    return null;
  }

  // No restaurant assigned to this user
  return null;
}

/**
 * Sign out the current user (client-side helper).
 */
export async function signOut() {
  const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
  const supabase = createBrowserClient();
  await supabase.auth.signOut();
}
