/* ─── Core DB Types ─── */

export interface DbRestaurant {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  cover_image_url: string;
  plan: "basic" | "pro";
  active: boolean;
  total_views: number;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order: number;
  created_at: string;
}

export interface DbMenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  restaurant_id: string | null;
  created_at: string;
}

export type UserRole = "restaurant_admin" | "super_admin";

/* ─── Legacy UI Types (used by existing components) ─── */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  available: boolean;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo: string;
  coverImage: string;
  categories: Category[];
  products: Product[];
  plan: "basic" | "pro";
  active: boolean;
  totalViews: number;
}

/* ─── Converters ─── */

/** Convert DB restaurant + categories + menu_items to legacy format for UI */
export function toLegacyRestaurant(
  r: DbRestaurant,
  categories: DbCategory[],
  items: DbMenuItem[]
): Restaurant {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    logo: r.logo_url,
    coverImage: r.cover_image_url,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
    })),
    products: items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.price,
      image: i.image_url,
      categoryId: i.category_id,
      available: i.is_available,
      order: i.order,
    })),
    plan: r.plan,
    active: r.active,
    totalViews: r.total_views,
  };
}

export type UserRole_Legacy = "public" | "restaurant-admin" | "super-admin";
