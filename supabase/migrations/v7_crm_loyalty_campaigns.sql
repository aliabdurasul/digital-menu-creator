-- v7: CRM customers, loyalty, notifications
-- Runs idempotently — safe to re-run.

-- ─── Module type on restaurants ───
DO $$ BEGIN
  ALTER TABLE public.restaurants ADD COLUMN module_type text DEFAULT 'restaurant';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.restaurants ADD COLUMN notification_enabled boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.restaurants ADD COLUMN notification_channel text DEFAULT 'sms';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Customers ───
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  whatsapp text,
  name text DEFAULT '',
  email text,
  module_type text DEFAULT 'restaurant',
  source text DEFAULT 'qr',
  total_orders int DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  loyalty_points int DEFAULT 0,
  loyalty_tier text DEFAULT 'bronze',
  tags text[] DEFAULT '{}',
  consent_given boolean DEFAULT false,
  consent_date timestamptz,
  first_visit timestamptz DEFAULT now(),
  last_visit timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

-- ─── Loyalty config per restaurant ───
CREATE TABLE IF NOT EXISTS public.loyalty_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT false,
  reward_threshold int DEFAULT 10,
  reward_type text DEFAULT 'free_item',
  reward_value numeric(10,2) DEFAULT 0,
  reward_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  message_template text DEFAULT 'Tebrikler {{name}}! {{threshold}}. siparişiniz — ödülünüz hazır! 🎁',
  created_at timestamptz DEFAULT now()
);

-- ─── Loyalty stamps ───
CREATE TABLE IF NOT EXISTS public.loyalty_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stamp_number int NOT NULL,
  is_reward boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ─── Customer link on orders ───
DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD COLUMN customer_phone text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Campaigns ───
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  module_type text DEFAULT 'all',
  channel text DEFAULT 'sms',
  target_segment jsonb DEFAULT '{}',
  message_template text NOT NULL,
  scheduled_at timestamptz,
  status text DEFAULT 'draft',
  total_recipients int DEFAULT 0,
  sent_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  channel text DEFAULT 'sms',
  status text DEFAULT 'pending',
  provider_ref text,
  sent_at timestamptz
);

-- ─── Notification log ───
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL,
  channel text DEFAULT 'sms',
  phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  provider_ref text,
  created_at timestamptz DEFAULT now()
);

-- ─── RLS Policies ───

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Customers: admin manages own restaurant's
DO $$ BEGIN
  CREATE POLICY customers_admin_all ON public.customers
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY customers_super ON public.customers
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Loyalty config: admin manages own
DO $$ BEGIN
  CREATE POLICY loyalty_config_admin ON public.loyalty_config
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_config_super ON public.loyalty_config
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Loyalty stamps: admin reads own restaurant's
DO $$ BEGIN
  CREATE POLICY loyalty_stamps_admin ON public.loyalty_stamps
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_stamps_super ON public.loyalty_stamps
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Campaigns: admin manages own
DO $$ BEGIN
  CREATE POLICY campaigns_admin ON public.campaigns
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY campaigns_super ON public.campaigns
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Campaign sends: admin reads own
DO $$ BEGIN
  CREATE POLICY campaign_sends_admin ON public.campaign_sends
    FOR ALL USING (
      campaign_id IN (
        SELECT id FROM public.campaigns WHERE restaurant_id IN (
          SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY campaign_sends_super ON public.campaign_sends
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification log: admin reads own
DO $$ BEGIN
  CREATE POLICY notification_log_admin ON public.notification_log
    FOR ALL USING (
      restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY notification_log_super ON public.notification_log
    FOR ALL USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON public.customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(restaurant_id, phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_stamps_customer ON public.loyalty_stamps(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant ON public.campaigns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_restaurant ON public.notification_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
