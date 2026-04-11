-- v9: Session-based loyalty system — zero-friction, localStorage customer_key identity.
-- Creates: customer_aliases, loyalty_programs, loyalty_progress tables.
-- Adds: customer_key column to orders.
-- Migrates: existing loyalty_config → loyalty_programs.
-- Runs idempotently — safe to re-run.

-- ─── Customer Aliases (identity linking) ───
-- Links localStorage customer_key to optional phone for cross-device merge.
CREATE TABLE IF NOT EXISTS public.customer_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key text NOT NULL,
  phone text,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_key, restaurant_id)
);

-- ─── Loyalty Programs (replaces loyalty_config with richer schema) ───
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT false,
  program_type text DEFAULT 'stamp',            -- 'stamp' | 'spend'
  target_count int DEFAULT 10,
  reward_type text DEFAULT 'free_item',         -- 'free_item' | 'discount_percent' | 'discount_amount'
  reward_value numeric(10,2) DEFAULT 0,
  reward_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  message_template text DEFAULT 'Tebrikler! {{threshold}} siparişi tamamladınız — {{reward}} kazandınız! 🎁',
  initial_progress_min int DEFAULT 1,           -- dynamic initial progress: random(min, max)
  initial_progress_max int DEFAULT 2,
  near_completion_threshold int DEFAULT 2,      -- UI urgency when N stamps away
  happy_hour_enabled boolean DEFAULT false,
  happy_hour_multiplier numeric(3,1) DEFAULT 2.0,
  happy_hour_start time,
  happy_hour_end time,
  happy_hour_days int[] DEFAULT '{1,2,3,4,5}',  -- 0=Sun,1=Mon...6=Sat
  reward_expiry_days int DEFAULT 0,             -- 0 = no expiry
  upsell_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ─── Loyalty Progress (per customer_key per program) ───
CREATE TABLE IF NOT EXISTS public.loyalty_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key text NOT NULL,
  program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  current_count int DEFAULT 0,                  -- includes pending (optimistic)
  confirmed_count int DEFAULT 0,                -- only confirmed (delivered)
  total_earned_rewards int DEFAULT 0,
  total_orders int DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  initial_progress int DEFAULT 0,               -- snapshot of endowed progress
  reward_ready boolean DEFAULT false,
  reward_expires_at timestamptz,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_key, program_id)
);

-- ─── Add customer_key to orders ───
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN customer_key text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Migrate existing loyalty_config → loyalty_programs ───
INSERT INTO public.loyalty_programs (
  restaurant_id, enabled, program_type, target_count,
  reward_type, reward_value, reward_item_id, message_template
)
SELECT
  lc.restaurant_id, lc.enabled, 'stamp', lc.reward_threshold,
  lc.reward_type, lc.reward_value, lc.reward_item_id, lc.message_template
FROM public.loyalty_config lc
WHERE NOT EXISTS (
  SELECT 1 FROM public.loyalty_programs lp
  WHERE lp.restaurant_id = lc.restaurant_id
);

-- ─── RLS Policies ───

ALTER TABLE public.customer_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;

-- customer_aliases: admin manages own restaurant's
DO $$ BEGIN
  CREATE POLICY customer_aliases_admin ON public.customer_aliases
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY customer_aliases_super ON public.customer_aliases
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- loyalty_programs: admin manages own
DO $$ BEGIN
  CREATE POLICY loyalty_programs_admin ON public.loyalty_programs
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_programs_super ON public.loyalty_programs
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- loyalty_progress: admin reads own restaurant's
DO $$ BEGIN
  CREATE POLICY loyalty_progress_admin ON public.loyalty_progress
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_progress_super ON public.loyalty_progress
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Indexes ───

CREATE INDEX IF NOT EXISTS idx_customer_aliases_restaurant ON public.customer_aliases(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customer_aliases_phone ON public.customer_aliases(restaurant_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_restaurant ON public.loyalty_programs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_progress_customer_key ON public.loyalty_progress(customer_key);
CREATE INDEX IF NOT EXISTS idx_loyalty_progress_program ON public.loyalty_progress(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_progress_restaurant ON public.loyalty_progress(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_key ON public.orders(customer_key) WHERE customer_key IS NOT NULL;
