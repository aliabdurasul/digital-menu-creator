"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

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

/**
 * Get the role of the currently authenticated user.
 * Uses the service-role key to bypass RLS on the profiles table.
 */
export async function getMyRole(): Promise<UserRole | null> {
  try {
    // Get the authenticated user from the session (cookie-based)
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    // Use admin client (bypasses RLS) to query profile
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
