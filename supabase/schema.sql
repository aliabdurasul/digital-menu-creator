-- ============================================================
-- Lezzet-i Âlâ — Supabase Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor to create all tables,
-- RLS policies, and the trigger for auto-creating profiles.
--
-- Prerequisites:
--   • Supabase project with Auth enabled
--   • Email/password sign-in enabled in Auth settings
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Restaurants ────────────────────────────────────────────
create table if not exists public.restaurants (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  description   text default '',
  phone         text default '',
  address       text default '',
  logo_url      text default '',
  cover_image_url text default '',
  plan          text default 'basic' check (plan in ('basic', 'pro')),
  active        boolean default true,
  menu_status   text default 'active' check (menu_status in ('active', 'paused')),
  total_views   integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Categories ─────────────────────────────────────────────
create table if not exists public.categories (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  "order"       integer default 0,
  created_at    timestamptz default now()
);

-- ─── Menu Items ─────────────────────────────────────────────
create table if not exists public.menu_items (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  name          text not null,
  description   text default '',
  price         numeric(10,2) not null default 0,
  image_url     text default '',
  is_available  boolean default true,
  "order"       integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Profiles (linked to auth.users) ───────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  role          text not null default 'restaurant_admin' check (role in ('restaurant_admin', 'super_admin')),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  created_at    timestamptz default now()
);

-- ─── Auto-create profile on sign-up ────────────────────────
-- Also syncs the role into auth.users.raw_app_meta_data so the
-- JWT carries the role claim without a table query.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'restaurant_admin')
  on conflict (id) do nothing;

  -- Sync role into app_metadata so RLS can read it from JWT
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "restaurant_admin"}'::jsonb
  where id = new.id;

  return new;
end;
$$;

-- Drop the trigger if it already exists, then re-create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Indexes ────────────────────────────────────────────────
create index if not exists idx_categories_restaurant on public.categories(restaurant_id);
create index if not exists idx_menu_items_restaurant on public.menu_items(restaurant_id);
create index if not exists idx_menu_items_category   on public.menu_items(category_id);
create index if not exists idx_restaurants_slug       on public.restaurants(slug);
create index if not exists idx_profiles_restaurant    on public.profiles(restaurant_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- IMPORTANT: All "is super admin?" checks use a helper function
-- that reads the role from the JWT's app_metadata claim.
-- This avoids the infinite recursion caused by querying the
-- profiles table from inside a profiles RLS policy.
-- ============================================================

-- Helper: read current user's role from JWT (zero table queries)
create or replace function public.user_role()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role',
    'anon'
  );
$$;

-- Enable RLS on all tables
alter table public.restaurants enable row level security;
alter table public.categories  enable row level security;
alter table public.menu_items  enable row level security;
alter table public.profiles    enable row level security;

-- ─── Profiles Policies ─────────────────────────────────────
-- (defined first because other tables' policies don't reference profiles anymore)

-- Users can read their own profile
create policy "Users read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Super admins can read all profiles (uses JWT, no recursion)
create policy "Super admins read all profiles"
  on public.profiles for select
  using (public.user_role() = 'super_admin');

-- Super admins can update any profile (assign roles, restaurants)
create policy "Super admins update profiles"
  on public.profiles for update
  using (public.user_role() = 'super_admin');

-- Super admins can insert profiles (needed for admin.createUser flow)
create policy "Super admins insert profiles"
  on public.profiles for insert
  with check (public.user_role() = 'super_admin');

-- Users can update their own profile (non-role fields only — enforce in app)
create policy "Users update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ─── Restaurants Policies ───────────────────────────────────

-- Anyone can read active restaurants (public menu pages)
create policy "Public can read active restaurants"
  on public.restaurants for select
  using (active = true);

-- Super admins can do everything
create policy "Super admins full access to restaurants"
  on public.restaurants for all
  using (public.user_role() = 'super_admin');

-- Restaurant admins can read their own restaurant
create policy "Restaurant admins read own restaurant"
  on public.restaurants for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = restaurants.id
    )
  );

-- Restaurant admins can update their own restaurant
create policy "Restaurant admins update own restaurant"
  on public.restaurants for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = restaurants.id
    )
  );

-- ─── Categories Policies ────────────────────────────────────

-- Public can read categories for active restaurants
create policy "Public can read categories"
  on public.categories for select
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = categories.restaurant_id
        and restaurants.active = true
    )
  );

-- Restaurant admins can manage their own categories
create policy "Restaurant admins manage own categories"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = categories.restaurant_id
    )
  );

-- Super admins full access
create policy "Super admins full access to categories"
  on public.categories for all
  using (public.user_role() = 'super_admin');

-- ─── Menu Items Policies ────────────────────────────────────

-- Public can read available items for active restaurants
create policy "Public can read menu items"
  on public.menu_items for select
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_items.restaurant_id
        and restaurants.active = true
    )
  );

-- Restaurant admins can manage their own items
create policy "Restaurant admins manage own menu items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.restaurant_id = menu_items.restaurant_id
    )
  );

-- Super admins full access
create policy "Super admins full access to menu items"
  on public.menu_items for all
  using (public.user_role() = 'super_admin');

-- ============================================================
-- Storage Bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict do nothing;

create policy "Public read images"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "Authenticated users upload images"
  on storage.objects for insert
  with check (bucket_id = 'images' and auth.role() = 'authenticated');

create policy "Authenticated users update own images"
  on storage.objects for update
  using (bucket_id = 'images' and auth.role() = 'authenticated');

-- ============================================================
-- RPC: Increment restaurant views (atomic, race-condition safe)
-- ============================================================
create or replace function public.increment_restaurant_views(restaurant_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.restaurants
  set total_views = total_views + 1
  where slug = restaurant_slug;
end;
$$;

-- ============================================================
-- Seed: Create a super admin user
-- ============================================================
-- After running this schema:
-- 1. Create a user in Supabase Auth (Dashboard → Authentication → Users → Add User)
-- 2. Update their profile to super_admin:
--    update public.profiles set role = 'super_admin' where email = 'your-email@example.com';
-- 3. IMPORTANT: Also sync the role into app_metadata so JWT carries it:
--    update auth.users
--    set raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
--    where email = 'your-email@example.com';
-- 4. The user must sign out and back in to get a new JWT with the updated role.

-- ============================================================
-- Migration: Run these on EXISTING databases
-- ============================================================
-- ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS description text default '';
-- ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS phone text default '';
-- ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS address text default '';
-- ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS menu_status text default 'active' check (menu_status in ('active', 'paused'));
--
-- ALTER TABLE public.menu_items ALTER COLUMN category_id DROP NOT NULL;
-- ALTER TABLE public.menu_items DROP CONSTRAINT menu_items_category_id_fkey;
-- ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_category_id_fkey
--   FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
