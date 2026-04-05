-- v9: Cron run log for idempotency and monitoring
-- Runs idempotently — safe to re-run.

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL DEFAULT 'all',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  results jsonb DEFAULT '{}',
  status text DEFAULT 'running',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_started
  ON public.cron_runs (started_at DESC);

-- RLS: service-role only (no client access needed)
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
