-- v10: Add loyalty tracking columns to orders table
-- These columns are written by processLoyaltyStamp on delivery,
-- triggering Supabase Realtime so admin sees reward events instantly.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_stamp_count int;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_stamps_needed int;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_reward_earned boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_reward_message text;
