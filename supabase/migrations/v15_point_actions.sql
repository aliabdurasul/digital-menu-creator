-- v15: Action-based points system
-- Points run alongside stamps — earned via non-order actions (PWA install, social share, etc.)

CREATE TABLE IF NOT EXISTS point_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'pwa_install' | 'social_share' | 'review' | 'referral' | 'birthday'
  points INTEGER NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate one-time actions (e.g. pwa_install per customer per restaurant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_actions_unique_action
  ON point_actions (customer_key, restaurant_id, action_type)
  WHERE action_type IN ('pwa_install', 'referral');

-- Fast lookup for points balance
CREATE INDEX IF NOT EXISTS idx_point_actions_customer
  ON point_actions (customer_key, restaurant_id);

-- RLS: service-role only
ALTER TABLE point_actions ENABLE ROW LEVEL SECURITY;

-- Add points configuration to loyalty_programs
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS points_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pwa_install_points INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS social_share_points INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS review_points INTEGER DEFAULT 30;
