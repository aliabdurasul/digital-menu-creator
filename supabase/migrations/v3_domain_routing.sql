-- ============================================================
-- Migration V3: Domain-based tenant routing & feature flags
-- ============================================================
-- Safe to run on existing production databases.
-- All changes are additive — no existing columns are modified.
-- ============================================================

-- ─── Add custom_domain column to restaurants ────────────────
-- Stores the custom domain for pro-plan restaurants.
-- NULL means no custom domain configured.
-- UNIQUE constraint ensures no two restaurants share a domain.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE DEFAULT NULL;

-- ─── Index for fast custom domain lookups ───────────────────
-- Partial index — only queries non-null domains (saves space).
-- The middleware's tenant resolver uses this for custom domain routing.
CREATE INDEX IF NOT EXISTS idx_restaurants_custom_domain
  ON public.restaurants(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- ─── Verify slug index exists (should already exist) ────────
CREATE INDEX IF NOT EXISTS idx_restaurants_slug
  ON public.restaurants(slug);

-- ============================================================
-- RLS: custom_domain is publicly readable (same as slug).
-- The existing "Public can read active restaurants" policy
-- already covers SELECT on all columns for active restaurants.
-- No new policies needed for public reads.
--
-- Restaurant admins can update their own restaurant's custom_domain
-- via the existing "Restaurant admins update own restaurant" policy.
-- Application-level feature flag enforcement prevents basic-plan
-- restaurants from setting a custom domain.
-- ============================================================

-- ============================================================
-- Notes for Vercel deployment:
--
-- 1. Run this migration BEFORE deploying the middleware update.
--    The middleware's domain resolver doesn't query the DB directly,
--    but the tenant-context module expects custom_domain to exist.
--
-- 2. Add wildcard domain *.yourdomain.com in Vercel project settings.
--
-- 3. Set ENABLE_DOMAIN_ROUTING=true in Vercel env vars when ready.
--    Until then, the middleware skips domain resolution entirely.
-- ============================================================
