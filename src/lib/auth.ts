import type { UserRole } from "@/types";
import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";

/**
 * Mock authenticated user for development.
 * Replace with real Supabase Auth when configured.
 *
 * TODO: Replace with real auth:
 *   const supabase = createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   const { data: profile } = await supabase
 *     .from('profiles')
 *     .select('role, restaurant_id')
 *     .eq('id', user.id)
 *     .single();
 */

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  restaurantId: string;
}

const mockUser: AuthUser = {
  id: "user-1",
  email: "admin@bellacucina.com",
  role: "restaurant-admin",
  restaurantId: "1",
};

/**
 * Get the currently authenticated user.
 * Returns mock data for development — swap to Supabase Auth in production.
 */
export function getCurrentUser(): AuthUser | null {
  // TODO: Replace with real Supabase Auth check
  return mockUser;
}

/**
 * Get the restaurant for the currently authenticated admin user.
 * Returns the real restaurant data from the authenticated user's restaurantId.
 *
 * TODO: Replace with Supabase query:
 *   const { data } = await supabase
 *     .from('restaurants')
 *     .select('*')
 *     .eq('id', user.restaurantId)
 *     .single();
 */
export function getCurrentRestaurant(): Restaurant | null {
  const user = getCurrentUser();
  if (!user || user.role !== "restaurant-admin") return null;

  const restaurant = mockRestaurants.find((r) => r.id === user.restaurantId);
  return restaurant || null;
}
