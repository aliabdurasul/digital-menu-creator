-- AR processing pipeline columns for menu_items
-- Run once against your Supabase project: supabase db push

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS ar_model_url_low      text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ar_model_url_raw      text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ar_model_size_bytes   int4    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ar_scale              float4  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ar_processing_status  text    DEFAULT 'none'
    CHECK (ar_processing_status IN ('none','pending','processing','ready','error')),
  ADD COLUMN IF NOT EXISTS ar_processing_error   text    DEFAULT NULL;

-- Index for admin polling queries on processing status
CREATE INDEX IF NOT EXISTS menu_items_ar_processing_status_idx
  ON menu_items (restaurant_id, ar_processing_status)
  WHERE ar_processing_status IN ('pending', 'processing');
