import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types";
import type { Restaurant } from "@/types";

/**
 * Server-side auth helpers — Supabase only (no mock fallback).
 */

/** Admin client that bypasses RLS */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient(url, serviceKey);
}

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

    // Fetch profile for role and restaurant_id using admin client (bypasses RLS)
    const admin = getAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // Profile query failed — do NOT assume a default role.
      // Returning null forces callers to handle the missing-profile case
      // instead of silently treating every user as restaurant_admin.
      console.error("[auth-server] Profile query failed:", profileError?.message);
      return null;
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
          description: dbRestaurant.description || "",
          phone: dbRestaurant.phone || "",
          address: dbRestaurant.address || "",
          logo: dbRestaurant.logo_url || "",
          coverImage: dbRestaurant.cover_image_url || "",
          categories: (categories || []).map((c: { id: string; name: string; order: number }) => ({
            id: c.id,
            name: c.name,
            order: c.order,
          })),
          products: (items || []).map((i: { id: string; name: string; description: string; price: number; image_url: string; category_id: string | null; is_available: boolean; order: number; ingredients: string; portion_info: string; allergen_info: string; ar_model_url?: string }) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price,
            image: i.image_url || "",
            categoryId: i.category_id,
            available: i.is_available,
            order: i.order,
            ingredients: i.ingredients || "",
            portionInfo: i.portion_info || "",
            allergenInfo: i.allergen_info || "",
            arModelUrl: i.ar_model_url || "",
          })),
          plan: dbRestaurant.plan || "basic",
          active: dbRestaurant.active ?? true,
          menuStatus: dbRestaurant.menu_status || "active",
          totalViews: dbRestaurant.total_views || 0,
          customDomain: dbRestaurant.custom_domain || null,
          domainStatus: dbRestaurant.domain_status || "pending",
          defaultLanguage: dbRestaurant.default_language || "tr",
          enabledLanguages: dbRestaurant.enabled_languages || ["tr"],
          moduleType: dbRestaurant.module_type || "restaurant",
          notificationEnabled: dbRestaurant.notification_enabled ?? false,
          notificationChannel: dbRestaurant.notification_channel || "sms",
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
