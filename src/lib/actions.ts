"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

// ─── Admin Client ───────────────────────────────────────────

/**
 * Create a Supabase admin client that bypasses RLS.
 * Uses SUPABASE_SERVICE_ROLE_KEY — never expose this on the client.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient(url, serviceKey);
}

// ─── Auth Helpers ───────────────────────────────────────────

/**
 * Get the role of the currently authenticated user.
 * Uses the service-role key to bypass RLS on the profiles table.
 */
export async function getMyRole(): Promise<UserRole | null> {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const admin = getAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[actions/getMyRole] Profile query failed:", profileError?.message);
      return null;
    }

    return profile.role as UserRole;
  } catch (err) {
    console.error("[actions/getMyRole] Unexpected error:", err);
    return null;
  }
}

/**
 * Get the full profile of the currently authenticated user.
 * Uses the service-role key to bypass RLS on the profiles table.
 */
export async function getMyProfile(): Promise<{
  id: string;
  email: string;
  role: UserRole;
  restaurant_id: string | null;
} | null> {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const admin = getAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[actions/getMyProfile] Profile query failed:", profileError?.message);
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
      role: profile.role as UserRole,
      restaurant_id: profile.restaurant_id,
    };
  } catch (err) {
    console.error("[actions/getMyProfile] Unexpected error:", err);
    return null;
  }
}

// ─── Super Admin Actions ────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

interface CreatedRestaurant {
  id: string;
  slug: string;
  name: string;
  adminUserId: string | null;
}

/**
 * Create a restaurant + optionally create an auth user for the admin.
 * This is an atomic operation — if user creation fails, the restaurant
 * is still created (admin can be assigned later).
 */
export async function createRestaurantWithAdmin(
  name: string,
  adminEmail?: string,
  adminPassword?: string,
  moduleType?: "cafe" | "restaurant"
): Promise<ActionResult<CreatedRestaurant>> {
  try {
    const admin = getAdminClient();
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // 1. Create restaurant
    const { data: restaurant, error: rError } = await admin
      .from("restaurants")
      .insert({
        name: name.trim(),
        slug,
        logo_url: "",
        cover_image_url: "",
        plan: "basic",
        active: true,
        total_views: 0,
        module_type: moduleType || "restaurant",
      })
      .select()
      .single();

    if (rError || !restaurant) {
      return { success: false, error: "Failed to create restaurant: " + (rError?.message || "Unknown") };
    }

    let adminUserId: string | null = null;

    // 2. Create admin user if email + password provided
    if (adminEmail && adminPassword) {
      const email = adminEmail.trim().toLowerCase();

      // Check if user already exists
      const { data: listData } = await admin.auth.admin.listUsers();
      const existingUser = (listData?.users ?? []).find(
        (u: { email?: string }) => u.email?.toLowerCase() === email
      );

      if (existingUser) {
        // User exists — just link their profile to this restaurant
        adminUserId = existingUser.id;

        await admin
          .from("profiles")
          .upsert({
            id: existingUser.id,
            email,
            role: "restaurant_admin" as const,
            restaurant_id: restaurant.id,
          }, { onConflict: "id" });

        // Sync app_metadata
        await admin.auth.admin.updateUserById(existingUser.id, {
          app_metadata: { role: "restaurant_admin" },
        });
      } else {
        // Create new auth user
        const { data: newUser, error: userError } = await admin.auth.admin.createUser({
          email,
          password: adminPassword,
          email_confirm: true,
          app_metadata: { role: "restaurant_admin" },
        });

        if (userError || !newUser.user) {
          // Restaurant created but user failed — return partial success
          return {
            success: true,
            data: {
              id: restaurant.id,
              slug: restaurant.slug,
              name: restaurant.name,
              adminUserId: null,
            },
          };
        }

        adminUserId = newUser.user.id;

        // The trigger should auto-create profile, but upsert to be safe
        // and to set restaurant_id + correct role
        await admin
          .from("profiles")
          .upsert({
            id: newUser.user.id,
            email,
            role: "restaurant_admin" as const,
            restaurant_id: restaurant.id,
          }, { onConflict: "id" });
      }
    }

    return {
      success: true,
      data: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        adminUserId,
      },
    };
  } catch (err) {
    console.error("[actions/createRestaurantWithAdmin]", err);
    return { success: false, error: "Unexpected error creating restaurant" };
  }
}

/**
 * Assign an existing user as admin of a restaurant by email.
 * If the user doesn't exist, optionally create them.
 */
export async function assignAdminToRestaurant(
  restaurantId: string,
  email: string,
  createIfMissing?: boolean,
  password?: string
): Promise<ActionResult<{ userId: string; email: string }>> {
  try {
    const admin = getAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    // Look up profile by email
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail);

    if (profiles && profiles.length > 0) {
      // User exists — update their profile
      const { error } = await admin
        .from("profiles")
        .update({ restaurant_id: restaurantId, role: "restaurant_admin" })
        .eq("id", profiles[0].id);

      if (error) {
        return { success: false, error: "Failed to assign admin: " + error.message };
      }

      // Sync app_metadata
      await admin.auth.admin.updateUserById(profiles[0].id, {
        app_metadata: { role: "restaurant_admin" },
      });

      return { success: true, data: { userId: profiles[0].id, email: normalizedEmail } };
    }

    // User not found
    if (!createIfMissing || !password) {
      return {
        success: false,
        error: "No account found with that email. Provide a password to create one.",
      };
    }

    // Create new user
    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      app_metadata: { role: "restaurant_admin" },
    });

    if (userError || !newUser.user) {
      return { success: false, error: "Failed to create user: " + (userError?.message || "Unknown") };
    }

    // Upsert profile with restaurant link
    await admin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: normalizedEmail,
        role: "restaurant_admin" as const,
        restaurant_id: restaurantId,
      }, { onConflict: "id" });

    return { success: true, data: { userId: newUser.user.id, email: normalizedEmail } };
  } catch (err) {
    console.error("[actions/assignAdminToRestaurant]", err);
    return { success: false, error: "Unexpected error assigning admin" };
  }
}

/**
 * Get all restaurants (admin view). Bypasses RLS.
 */
export async function getAllRestaurantsAdmin(): Promise<
  ActionResult<Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    phone: string;
    address: string;
    logo_url: string;
    cover_image_url: string;
    plan: string;
    active: boolean;
    menu_status: string;
    total_views: number;
    custom_domain: string | null;
    domain_status: string;
    default_language: string;
    enabled_languages: string[];
    module_type: string;
    notification_enabled: boolean;
    notification_channel: string;
  }>>
> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to load restaurants: " + error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error("[actions/getAllRestaurantsAdmin]", err);
    return { success: false, error: "Unexpected error loading restaurants" };
  }
}

/**
 * Delete a restaurant and cascade-clean related data.
 */
export async function deleteRestaurantFull(
  restaurantId: string
): Promise<ActionResult> {
  try {
    const admin = getAdminClient();

    // Unlink any admins assigned to this restaurant
    await admin
      .from("profiles")
      .update({ restaurant_id: null })
      .eq("restaurant_id", restaurantId);

    // Cascade: menu_items → categories → restaurant
    await admin.from("menu_items").delete().eq("restaurant_id", restaurantId);
    await admin.from("categories").delete().eq("restaurant_id", restaurantId);
    const { error } = await admin
      .from("restaurants")
      .delete()
      .eq("id", restaurantId);

    if (error) {
      return { success: false, error: "Failed to delete restaurant: " + error.message };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[actions/deleteRestaurantFull]", err);
    return { success: false, error: "Unexpected error deleting restaurant" };
  }
}

/**
 * Toggle a restaurant's active status.
 */
export async function toggleRestaurantActive(
  restaurantId: string,
  currentActive: boolean
): Promise<ActionResult> {
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from("restaurants")
      .update({ active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);

    if (error) {
      return { success: false, error: "Failed to toggle status: " + error.message };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[actions/toggleRestaurantActive]", err);
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Change a restaurant's plan.
 */
export async function changeRestaurantPlan(
  restaurantId: string,
  plan: "basic" | "pro"
): Promise<ActionResult> {
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from("restaurants")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);

    if (error) {
      return { success: false, error: "Failed to change plan: " + error.message };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[actions/changeRestaurantPlan]", err);
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Change a restaurant's module type (cafe / restaurant).
 */
export async function changeRestaurantModuleType(
  restaurantId: string,
  moduleType: "cafe" | "restaurant"
): Promise<ActionResult> {
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from("restaurants")
      .update({ module_type: moduleType, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);

    if (error) {
      return { success: false, error: "Failed to change module type: " + error.message };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[actions/changeRestaurantModuleType]", err);
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Rename a restaurant.
 */
export async function renameRestaurant(
  restaurantId: string,
  newName: string
): Promise<ActionResult<{ slug: string }>> {
  try {
    const admin = getAdminClient();
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { error } = await admin
      .from("restaurants")
      .update({
        name: newName.trim(),
        slug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId);

    if (error) {
      return { success: false, error: "Failed to rename: " + error.message };
    }

    return { success: true, data: { slug } };
  } catch (err) {
    console.error("[actions/renameRestaurant]", err);
    return { success: false, error: "Unexpected error" };
  }
}
