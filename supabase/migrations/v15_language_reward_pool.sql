-- v15: Language tracking for push tokens + reward pool for loyalty programs

-- Add language to push_tokens so notifications can be sent in the user's language.
-- 'tr' (Turkish) and 'en' (English) are supported; everything else defaults to 'tr'.
ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'tr';

-- Add reward_pool to loyalty_programs so admins can configure multiple possible
-- reward products and customers can choose one when their reward is ready.
-- Stored as JSONB: [{ "menuItemId": "...", "name": "...", "image": "..." }, ...]
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS reward_pool JSONB NOT NULL DEFAULT '[]';
