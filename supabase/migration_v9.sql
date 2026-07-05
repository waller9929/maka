-- ==========================================================
-- Migration v9 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2~v8.sql).
--
-- This applies:
-- 1. A sponsored_ads table so the admin can register paying local
--    businesses (name, image, link, optional date range) and have
--    one banner shown at a time on the homepage, just above the
--    filter bar. Ads outside their start/end date are simply not
--    shown — no separate "active" flag to maintain.
-- ==========================================================

create table if not exists public.sponsored_ads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  message text,
  image_url text,
  link_url text,
  starts_at date not null default current_date,
  ends_at date,
  created_at timestamptz not null default now()
);

alter table public.sponsored_ads enable row level security;

drop policy if exists "sponsored ads are viewable by everyone" on public.sponsored_ads;
create policy "sponsored ads are viewable by everyone"
  on public.sponsored_ads for select
  using (true);

drop policy if exists "only admins can insert sponsored ads" on public.sponsored_ads;
create policy "only admins can insert sponsored ads"
  on public.sponsored_ads for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "only admins can update sponsored ads" on public.sponsored_ads;
create policy "only admins can update sponsored ads"
  on public.sponsored_ads for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "only admins can delete sponsored ads" on public.sponsored_ads;
create policy "only admins can delete sponsored ads"
  on public.sponsored_ads for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
