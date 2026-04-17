-- v12: Push notification tokens (Firebase Cloud Messaging)
-- Stores FCM tokens per customer_key + restaurant for web push notifications.

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One token per customer per restaurant (upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_customer_restaurant
  ON push_tokens (customer_key, restaurant_id);

-- Fast lookup by customer_key (for sending pushes)
CREATE INDEX IF NOT EXISTS idx_push_tokens_customer
  ON push_tokens (customer_key);

-- RLS: service-role only (tokens managed via API routes)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Track whether inactivity push was already sent (prevent duplicates)
ALTER TABLE loyalty_progress
  ADD COLUMN IF NOT EXISTS inactivity_push_sent BOOLEAN DEFAULT FALSE;
