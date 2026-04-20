-- v14: Push language support
-- Store user's preferred language alongside their FCM token so push
-- notifications can be sent in the correct language (TR/EN).

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'tr';

-- Also store language in push_user_state for the event engine
ALTER TABLE push_user_state
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'tr';
