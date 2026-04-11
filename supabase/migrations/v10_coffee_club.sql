-- v10: Coffee Club loyalty panel
-- Run on Supabase dashboard → SQL Editor

-- 1. loyalty_programs: add club name + reward item override
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS club_name TEXT NOT NULL DEFAULT 'Coffee Club',
  ADD COLUMN IF NOT EXISTS reward_item_name TEXT;

-- 2. order_items: flag loyalty reward items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_loyalty_reward BOOLEAN NOT NULL DEFAULT false;
