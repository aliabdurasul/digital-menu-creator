-- Push Event System tables
-- Supports event-driven push architecture with throttle/trust scoring

-- 1. Push events log (append-only audit trail)
CREATE TABLE IF NOT EXISTS push_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  customer_key uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- sent, throttled, failed
  reason text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for analytics & debugging
CREATE INDEX IF NOT EXISTS idx_push_events_customer ON push_events(customer_key, restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_events_type ON push_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_events_status ON push_events(status, created_at DESC);

-- 2. Per-customer push state (throttle counters, merge keys)
CREATE TABLE IF NOT EXISTS push_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  daily_count int NOT NULL DEFAULT 0,
  daily_reset_at timestamptz NOT NULL DEFAULT (now() + interval '1 day')::date,
  last_event_keys jsonb DEFAULT '{}'::jsonb, -- mergeKey → ISO timestamp
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_key, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_push_user_state_lookup ON push_user_state(customer_key, restaurant_id);

-- RLS: service role only (server-side push engine)
ALTER TABLE push_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_user_state ENABLE ROW LEVEL SECURITY;

-- No public policies — these tables are accessed only via service_role key
