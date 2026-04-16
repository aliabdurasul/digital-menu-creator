-- v10: Coffee Club — add club_name, reward_item_name to loyalty_programs,
-- and is_loyalty_reward flag to order_items.

ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS club_name TEXT NOT NULL DEFAULT 'Coffee Club',
  ADD COLUMN IF NOT EXISTS reward_item_name TEXT;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_loyalty_reward BOOLEAN NOT NULL DEFAULT false;
