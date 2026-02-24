-- ============================================================
-- V4: Multi-tenant domains, translations, subscriptions
-- ============================================================
-- Run in Supabase SQL Editor on EXISTING databases.
-- For fresh installs, update schema.sql directly instead.
-- ============================================================

-- ─── Restaurants: Domain & Language columns ─────────────────
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS custom_domain text unique;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS domain_status text default 'pending' check (domain_status in ('pending', 'dns_verified', 'active', 'rejected'));
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS default_language text default 'tr' check (default_language in ('tr', 'en'));
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS enabled_languages text[] default '{tr}';

-- ─── Restaurant Translations ────────────────────────────────
create table if not exists public.restaurant_translations (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  language      text not null check (language in ('tr', 'en')),
  name          text not null default '',
  description   text default '',
  created_at    timestamptz default now(),
  unique (restaurant_id, language)
);

-- ─── Category Translations ──────────────────────────────────
create table if not exists public.category_translations (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid not null references public.categories(id) on delete cascade,
  language      text not null check (language in ('tr', 'en')),
  name          text not null default '',
  created_at    timestamptz default now(),
  unique (category_id, language)
);

-- ─── Menu Item Translations ─────────────────────────────────
create table if not exists public.menu_item_translations (
  id            uuid primary key default uuid_generate_v4(),
  menu_item_id  uuid not null references public.menu_items(id) on delete cascade,
  language      text not null check (language in ('tr', 'en')),
  name          text not null default '',
  description   text default '',
  ingredients   text default '',
  portion_info  text default '',
  allergen_info text default '',
  created_at    timestamptz default now(),
  unique (menu_item_id, language)
);

-- ─── Subscriptions (future-ready) ───────────────────────────
create table if not exists public.subscriptions (
  id                       uuid primary key default uuid_generate_v4(),
  restaurant_id            uuid not null references public.restaurants(id) on delete cascade,
  plan                     text not null default 'basic' check (plan in ('basic', 'pro')),
  status                   text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'trial')),
  started_at               timestamptz default now(),
  expires_at               timestamptz,
  payment_provider         text check (payment_provider in ('iyzico', 'manual')),
  provider_subscription_id text,
  created_at               timestamptz default now()
);

-- ─── Payments (future-ready) ────────────────────────────────
create table if not exists public.payments (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount          numeric(10,2) not null default 0,
  currency        text not null default 'TRY',
  type            text not null check (type in ('setup', 'recurring', 'one_time')),
  status          text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  provider_ref    text,
  created_at      timestamptz default now()
);

-- ─── Indexes ────────────────────────────────────────────────
-- idx_restaurants_custom_domain already exists in schema.sql
create index if not exists idx_restaurants_plan_active on public.restaurants(plan, active);
create index if not exists idx_restaurant_translations_lookup on public.restaurant_translations(restaurant_id, language);
create index if not exists idx_category_translations_lookup on public.category_translations(category_id, language);
create index if not exists idx_menu_item_translations_lookup on public.menu_item_translations(menu_item_id, language);
create index if not exists idx_subscriptions_restaurant on public.subscriptions(restaurant_id);
create index if not exists idx_payments_restaurant on public.payments(restaurant_id);

-- ─── RLS: Translation Tables ────────────────────────────────
alter table public.restaurant_translations enable row level security;
alter table public.category_translations enable row level security;
alter table public.menu_item_translations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- Restaurant Translations
create policy "Public can read restaurant translations"
  on public.restaurant_translations for select
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = restaurant_translations.restaurant_id
        and restaurants.active = true
    )
  );

create policy "Restaurant admins manage own restaurant translations"
  on public.restaurant_translations for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = restaurant_translations.restaurant_id
    )
  );

create policy "Super admins full access to restaurant translations"
  on public.restaurant_translations for all
  using (public.user_role() = 'super_admin');

-- Category Translations
create policy "Public can read category translations"
  on public.category_translations for select
  using (
    exists (
      select 1 from public.categories
      join public.restaurants on restaurants.id = categories.restaurant_id
      where categories.id = category_translations.category_id
        and restaurants.active = true
    )
  );

create policy "Restaurant admins manage own category translations"
  on public.category_translations for all
  using (
    exists (
      select 1 from public.categories
      join public.profiles on profiles.restaurant_id = categories.restaurant_id
      where categories.id = category_translations.category_id
        and profiles.id = auth.uid()
    )
  );

create policy "Super admins full access to category translations"
  on public.category_translations for all
  using (public.user_role() = 'super_admin');

-- Menu Item Translations
create policy "Public can read menu item translations"
  on public.menu_item_translations for select
  using (
    exists (
      select 1 from public.menu_items
      join public.restaurants on restaurants.id = menu_items.restaurant_id
      where menu_items.id = menu_item_translations.menu_item_id
        and restaurants.active = true
    )
  );

create policy "Restaurant admins manage own menu item translations"
  on public.menu_item_translations for all
  using (
    exists (
      select 1 from public.menu_items
      join public.profiles on profiles.restaurant_id = menu_items.restaurant_id
      where menu_items.id = menu_item_translations.menu_item_id
        and profiles.id = auth.uid()
    )
  );

create policy "Super admins full access to menu item translations"
  on public.menu_item_translations for all
  using (public.user_role() = 'super_admin');

-- Subscriptions & Payments (admin-only for now)
create policy "Super admins full access to subscriptions"
  on public.subscriptions for all
  using (public.user_role() = 'super_admin');

create policy "Restaurant admins read own subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = subscriptions.restaurant_id
    )
  );

create policy "Super admins full access to payments"
  on public.payments for all
  using (public.user_role() = 'super_admin');

create policy "Restaurant admins read own payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = payments.restaurant_id
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
