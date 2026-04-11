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
  module_type: "cafe" | "restaurant";
  notification_enabled: boolean;
  notification_channel: "sms" | "whatsapp" | "both";
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
  ar_model_url: string;
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
  arModelUrl: string;
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
  moduleType: "cafe" | "restaurant";
  notificationEnabled: boolean;
  notificationChannel: "sms" | "whatsapp" | "both";
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
      arModelUrl: i.ar_model_url || "",
    })),
    plan: r.plan,
    active: r.active,
    menuStatus: r.menu_status || "active",
    totalViews: r.total_views,
    customDomain: r.custom_domain || null,
    domainStatus: r.domain_status || "pending",
    defaultLanguage: r.default_language || "tr",
    enabledLanguages: r.enabled_languages || ["tr"],
    moduleType: r.module_type || "restaurant",
    notificationEnabled: r.notification_enabled ?? false,
    notificationChannel: r.notification_channel || "sms",
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
  table_id: string | null;
  session_id: string;
  customer_id: string | null;
  customer_phone: string | null;
  customer_key: string | null;
  status: OrderStatus;
  source: string;
  note: string;
  total: number;
  loyalty_stamp_count: number | null;
  loyalty_stamps_needed: number | null;
  loyalty_reward_earned: boolean;
  loyalty_reward_message: string | null;
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

/* ─── Loyalty Result ─── */
export interface LoyaltyResult {
  stamped: boolean;
  rewarded: boolean;
  stampCount: number;
  stampsNeeded: number;
  rewardMessage?: string;
}

/* ─── Module Type ─── */
export type ModuleType = "cafe" | "restaurant";
export type NotificationChannel = "sms" | "whatsapp" | "both";
export type LoyaltyTier = "bronze" | "silver" | "gold" | "vip";
export type CustomerSource = "qr" | "pos" | "manual" | "import";
export type NotificationType = "order_ready" | "loyalty_reward" | "welcome";

/* ─── Customer & Loyalty Types ─── */

export interface DbCustomer {
  id: string;
  restaurant_id: string;
  phone: string;
  whatsapp: string | null;
  name: string;
  email: string | null;
  module_type: ModuleType;
  source: CustomerSource;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  tags: string[];
  consent_given: boolean;
  consent_date: string | null;
  first_visit: string;
  last_visit: string;
  created_at: string;
}

export interface DbLoyaltyConfig {
  id: string;
  restaurant_id: string;
  enabled: boolean;
  reward_threshold: number;
  reward_type: "free_item" | "discount_percent" | "discount_amount";
  reward_value: number;
  reward_item_id: string | null;
  message_template: string;
  created_at: string;
}

export interface DbLoyaltyStamp {
  id: string;
  customer_id: string;
  order_id: string | null;
  restaurant_id: string;
  stamp_number: number;
  is_reward: boolean;
  created_at: string;
}

export interface DbNotificationLog {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  order_id: string | null;
  type: NotificationType;
  channel: "sms" | "whatsapp";
  phone: string;
  message: string;
  status: "pending" | "sent" | "failed";
  provider_ref: string | null;
  created_at: string;
}

/* ─── Session-Based Loyalty Types ─── */

export interface DbCustomerAlias {
  id: string;
  customer_key: string;
  phone: string | null;
  restaurant_id: string;
  created_at: string;
}

export type LoyaltyProgramType = "stamp" | "spend";
export type LoyaltyRewardType = "free_item" | "discount_percent" | "discount_amount";

export interface DbLoyaltyProgram {
  id: string;
  restaurant_id: string;
  enabled: boolean;
  program_type: LoyaltyProgramType;
  target_count: number;
  reward_type: LoyaltyRewardType;
  reward_value: number;
  reward_item_id: string | null;
  message_template: string;
  initial_progress_min: number;
  initial_progress_max: number;
  near_completion_threshold: number;
  happy_hour_enabled: boolean;
  happy_hour_multiplier: number;
  happy_hour_start: string | null;
  happy_hour_end: string | null;
  happy_hour_days: number[];
  reward_expiry_days: number;
  upsell_enabled: boolean;
  created_at: string;
}

export interface DbLoyaltyProgress {
  id: string;
  customer_key: string;
  program_id: string;
  restaurant_id: string;
  current_count: number;
  confirmed_count: number;
  total_earned_rewards: number;
  total_orders: number;
  total_spent: number;
  initial_progress: number;
  reward_ready: boolean;
  reward_expires_at: string | null;
  last_activity_at: string;
  created_at: string;
}

export interface LoyaltyProgressResponse {
  progress: {
    current: number;
    confirmed: number;
    target: number;
    percent: number;
    initial: number;
  };
  reward: {
    ready: boolean;
    type: LoyaltyRewardType;
    value: number;
    message: string | null;
    expiresAt: string | null;
  };
  bonuses: {
    happyHour: boolean;
    multiplier: number;
    nearCompletion: boolean;
    stampsAway: number;
  };
  upsell: {
    message: string;
    recommendedItem?: string;
  } | null;
}
