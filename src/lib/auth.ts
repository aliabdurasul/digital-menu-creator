/**
 * Client-side auth helpers.
 * For server-side auth, use auth-server.ts instead.
 */

export { getCurrentUser, getCurrentRestaurant } from "@/lib/auth-server";

/** Sign out (client-side) */
export async function signOut() {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  await supabase.auth.signOut();
}
