-- v8: Remove CRM & Campaign systems from architecture.
-- Keeps: customers (slim loyalty identifier), loyalty_config, loyalty_stamps, notification_log.
-- Drops: campaigns, campaign_sends tables + related policies/indexes.
-- Runs idempotently — safe to re-run.

-- ─── Drop RLS Policies ───

DROP POLICY IF EXISTS campaign_sends_admin ON public.campaign_sends;
DROP POLICY IF EXISTS campaign_sends_super ON public.campaign_sends;
DROP POLICY IF EXISTS campaigns_admin ON public.campaigns;
DROP POLICY IF EXISTS campaigns_super ON public.campaigns;

-- ─── Drop Indexes ───

DROP INDEX IF EXISTS idx_campaigns_restaurant;

-- ─── Drop Tables (order matters: campaign_sends depends on campaigns) ───

DROP TABLE IF EXISTS public.campaign_sends;
DROP TABLE IF EXISTS public.campaigns;
