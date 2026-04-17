-- v11: Behavior-Driven Engagement Engine
-- Adds: streaks, inactivity triggers, secret rewards, favorite product tracking.

/* ─── loyalty_progress — new columns ─── */
ALTER TABLE loyalty_progress
  ADD COLUMN IF NOT EXISTS streak_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_date DATE,
  ADD COLUMN IF NOT EXISTS favorite_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inactivity_bonus_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inactivity_bonus_expires_at TIMESTAMPTZ;

/* ─── loyalty_programs — new admin settings ─── */
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS streak_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS streak_bonus_threshold INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS streak_bonus_multiplier INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS inactivity_trigger_days INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS inactivity_bonus_multiplier INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS secret_reward_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secret_reward_probability FLOAT NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS secret_reward_discount_percent INT NOT NULL DEFAULT 10;

/* ─── secret_reward_history — tracks granted secret discounts ─── */
CREATE TABLE IF NOT EXISTS secret_reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  discount_percent INT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secret_reward_customer
  ON secret_reward_history (customer_key, restaurant_id, used);

-- RLS: service-role only (no direct client access)
ALTER TABLE secret_reward_history ENABLE ROW LEVEL SECURITY;

/* ─── RPC: get customer's most-ordered item ─── */
CREATE OR REPLACE FUNCTION get_customer_favorite_item(
  p_customer_key TEXT,
  p_restaurant_id UUID
)
RETURNS TABLE (menu_item_id UUID, name TEXT, image_url TEXT, order_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    oi.menu_item_id,
    mi.name,
    mi.image_url,
    SUM(oi.quantity)::BIGINT AS order_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.customer_key = p_customer_key
    AND o.restaurant_id = p_restaurant_id
    AND oi.is_loyalty_reward = false
    AND oi.menu_item_id IS NOT NULL
  GROUP BY oi.menu_item_id, mi.name, mi.image_url
  ORDER BY order_count DESC
  LIMIT 1;
$$;

/* ─── RPC: get restaurant's global bestseller ─── */
CREATE OR REPLACE FUNCTION get_restaurant_bestseller(
  p_restaurant_id UUID
)
RETURNS TABLE (menu_item_id UUID, name TEXT, image_url TEXT, order_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    oi.menu_item_id,
    mi.name,
    mi.image_url,
    SUM(oi.quantity)::BIGINT AS order_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.restaurant_id = p_restaurant_id
    AND oi.is_loyalty_reward = false
    AND oi.menu_item_id IS NOT NULL
  GROUP BY oi.menu_item_id, mi.name, mi.image_url
  ORDER BY order_count DESC
  LIMIT 1;
$$;
