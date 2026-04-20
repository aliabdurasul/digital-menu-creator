-- v17: Add admin-configured "Günün Ürünü" (featured item) to loyalty programs.
-- When set, overrides the auto-detected favourite item shown to customers.

ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS featured_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN loyalty_programs.featured_item_id IS 'Admin-set "featured item of the day" — overrides auto-detected favourite.';
