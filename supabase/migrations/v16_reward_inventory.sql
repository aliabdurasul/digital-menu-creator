-- v16: Replace boolean reward_ready with integer pending_rewards
-- This allows customers to accumulate multiple unclaimed stamp rewards.

ALTER TABLE loyalty_progress
  ADD COLUMN IF NOT EXISTS pending_rewards INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data: reward_ready = true → pending_rewards = 1
UPDATE loyalty_progress
  SET pending_rewards = 1
  WHERE reward_ready = TRUE AND pending_rewards = 0;

-- Keep reward_ready column for backwards compat during rollout;
-- new code reads/writes pending_rewards instead.
