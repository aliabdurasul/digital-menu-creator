/* ─── Core DB Types ─── */

export interface DbRestaurant {
  id: string;
  slug: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  logo_url: string;
  cover_image_url: string;
  plan: "basic" | "pro";
  active: boolean;
  menu_status: "active" | "paused";
  total_views: number;
  custom_domain: string | null;
  domain_status: "pending" | "dns_verified" | "active" | "rejected";
  default_language: "tr" | "en";
  enabled_languages: string[];
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
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  order: number;
  ingredients: string;
  portion_info: string;
  allergen_info: string;
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

/* ─── Translation DB Types ─── */

export interface DbRestaurantTranslation {
  id: string;
  restaurant_id: string;
  language: string;
  name: string;
  description: string;
  created_at: string;
}

export interface DbCategoryTranslation {
  id: string;
  category_id: string;
  language: string;
  name: string;
  created_at: string;
}

export interface DbMenuItemTranslation {
  id: string;
  menu_item_id: string;
  language: string;
  name: string;
  description: string;
  ingredients: string;
  portion_info: string;
  allergen_info: string;
  created_at: string;
}

/* ─── Legacy UI Types (used by existing components) ─── */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string | null;
  available: boolean;
  order: number;
  ingredients: string;
  portionInfo: string;
  allergenInfo: string;
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
  description: string;
  phone: string;
  address: string;
  logo: string;
  coverImage: string;
  categories: Category[];
  products: Product[];
  plan: "basic" | "pro";
  active: boolean;
  menuStatus: "active" | "paused";
  totalViews: number;
  customDomain: string | null;
  domainStatus: "pending" | "dns_verified" | "active" | "rejected";
  defaultLanguage: "tr" | "en";
  enabledLanguages: string[];
}

/* ─── Tenant Resolution ─── */

export interface TenantInfo {
  type: "domain" | "slug" | "none";
  restaurantId?: string;
  slug?: string;
  domain?: string;
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
    description: r.description || "",
    phone: r.phone || "",
    address: r.address || "",
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
      ingredients: i.ingredients || "",
      portionInfo: i.portion_info || "",
      allergenInfo: i.allergen_info || "",
    })),
    plan: r.plan,
    active: r.active,
    menuStatus: r.menu_status || "active",
    totalViews: r.total_views,
    customDomain: r.custom_domain || null,
    domainStatus: r.domain_status || "pending",
    defaultLanguage: r.default_language || "tr",
    enabledLanguages: r.enabled_languages || ["tr"],
  };
}

export type UserRole_Legacy = "public" | "restaurant-admin" | "super-admin";

/* ─── Table Ordering Types ─── */

export type TableStatus = "active" | "inactive";
export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";

export interface DbTable {
  id: string;
  restaurant_id: string;
  label: string;
  status: TableStatus;
  created_at: string;
}

export interface DbOrder {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  status: OrderStatus;
  source: string;
  note: string;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  created_at: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface OrderWithItems extends DbOrder {
  items: DbOrderItem[];
  table?: DbTable;
}
