-- =============================================
-- v5: Table Ordering System  (v2 — simplified RLS)
-- =============================================
-- The public order API uses the service-role key so it bypasses RLS.
-- RLS now only gates admin access (restaurant owners reading/managing
-- their own orders and tables).
--
-- Changes vs v1:
--   • table_id is NULLABLE (supports takeaway / non-table orders)
--   • Removed fragile public INSERT/SELECT policies
--   • Source defaults to 'qr'

-- ─── Enums (idempotent) ───
DO $$ BEGIN
  CREATE TYPE table_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Restaurant Tables ───
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label         text NOT NULL,
  status        table_status NOT NULL DEFAULT 'active',
  created_at    timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (restaurant_id, label)          -- no duplicate labels per restaurant
);

-- ─── Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id      uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,  -- nullable for takeaway
  session_id    text NOT NULL DEFAULT '',        -- anonymous browser UUID
  status        order_status NOT NULL DEFAULT 'pending',
  source        text NOT NULL DEFAULT 'qr',     -- 'qr' | 'pos' | 'waiter' | 'takeaway'
  note          text DEFAULT '',
  total         numeric(10,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Order Items ───
CREATE TABLE IF NOT EXISTS order_items (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   uuid REFERENCES menu_items(id) ON DELETE SET NULL,   -- nullable so SET NULL works
  name_snapshot  text NOT NULL,
  price_snapshot numeric(10,2) NOT NULL,
  quantity       int  NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_rt_restaurant       ON restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_rest_status   ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table_status  ON orders(table_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_session       ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_oi_order             ON order_items(order_id);

-- ─── Updated-at trigger ───
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════
-- RLS  (admin-only — public orders go through service-role API)
-- ═══════════════════════════
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;

-- ── restaurant_tables ──
CREATE POLICY "rt_admin_all" ON restaurant_tables
  FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

-- public: read active tables (needed for QR scan validation on client)
CREATE POLICY "rt_public_read" ON restaurant_tables
  FOR SELECT USING (status = 'active');

-- ── orders (admin only) ──
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

-- ── order_items (admin only) ──
CREATE POLICY "oi_admin_all" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders
      WHERE restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ─── Realtime ───
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
