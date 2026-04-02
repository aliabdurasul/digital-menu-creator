-- v6: Add AR model support to menu items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS ar_model_url text DEFAULT '';
