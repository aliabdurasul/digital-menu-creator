-- v8: Notification queue columns for durable SMS retry
-- Runs idempotently — safe to re-run.

-- Add queue columns to notification_log
DO $$ BEGIN
  ALTER TABLE public.notification_log ADD COLUMN attempt_count int DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.notification_log ADD COLUMN max_attempts int DEFAULT 4;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.notification_log ADD COLUMN next_attempt_at timestamptz DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.notification_log ADD COLUMN last_error text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.notification_log ADD COLUMN sent_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Partial index for efficient queue polling
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON public.notification_log (next_attempt_at)
  WHERE status IN ('pending', 'failed') AND attempt_count < max_attempts;
