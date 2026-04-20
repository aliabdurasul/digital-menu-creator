-- v14: Point Store + Referral System
-- Points are earned via actions (PWA install, referral, social share, order bonus)
-- and spent in the point store on configurable rewards.

/* ──────────────── Point Actions (earning log) ──────────────── */
CREATE TABLE IF NOT EXISTS point_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'pwa_install' | 'social_share' | 'review' | 'referral_bonus' | 'referee_bonus' | 'order_bonus'
  points INTEGER NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate one-time actions (PWA install can only earn once)
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_actions_unique_onetime
  ON point_actions (customer_key, restaurant_id, action_type)
  WHERE action_type IN ('pwa_install');

CREATE INDEX IF NOT EXISTS idx_point_actions_customer
  ON point_actions (customer_key, restaurant_id);

ALTER TABLE point_actions ENABLE ROW LEVEL SECURITY;

/* ──────────────── Point Store Items ──────────────── */
CREATE TABLE IF NOT EXISTS point_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  cost_points INTEGER NOT NULL DEFAULT 100,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  stock INTEGER DEFAULT -1, -- -1 = unlimited
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_store_restaurant
  ON point_store_items (restaurant_id) WHERE active = TRUE;

ALTER TABLE point_store_items ENABLE ROW LEVEL SECURITY;

/* ──────────────── Point Redemptions ──────────────── */
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES point_store_items(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'used' | 'expired'
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_redemptions_customer
  ON point_redemptions (customer_key, restaurant_id);

ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

/* ──────────────── Referral System ──────────────── */
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One code per customer per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_unique
  ON referral_codes (customer_key, restaurant_id);

-- Fast lookup by code
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes (restaurant_id, code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS referral_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_key TEXT NOT NULL,
  referee_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  referrer_points INTEGER NOT NULL DEFAULT 0,
  referee_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One referral per referee per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_tracks_unique
  ON referral_tracks (referee_key, restaurant_id);

ALTER TABLE referral_tracks ENABLE ROW LEVEL SECURITY;

/* ──────────────── Loyalty Program Extensions ──────────────── */
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS points_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pwa_install_points INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS social_share_points INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS review_points INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS referral_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS referee_bonus_points INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS order_points_per_item INTEGER DEFAULT 10;
