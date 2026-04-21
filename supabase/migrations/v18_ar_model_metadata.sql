-- v18: AR model real-world size metadata
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS ar_model_size_cm FLOAT DEFAULT NULL;
