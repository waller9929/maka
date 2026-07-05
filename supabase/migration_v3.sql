-- ==========================================================
-- Migration v3 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2.sql).
--
-- This applies:
-- 1. Replace the numeric "price range" field with a simpler
--    "restaurant type" field: Value / Standard / Premium.
-- 2. Add an app_settings table so the admin can edit the
--    homepage title from within the site.
-- ==========================================================

-- 1. Restaurant type column
alter table public.places add column if not exists restaurant_type text;

-- Best-effort conversion of old price_range values, if that column
-- still exists on this project.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'price_range'
  ) then
    update public.places set restaurant_type = 'Value'
      where restaurant_type is null and price_range in ('Under $10', '1만원 이하');
    update public.places set restaurant_type = 'Standard'
      where restaurant_type is null and price_range in ('$10-20', '1~2만원');
    update public.places set restaurant_type = 'Premium'
      where restaurant_type is null and price_range in ('$20-30', 'Over $30', '2~3만원', '3만원 이상');

    alter table public.places drop column price_range;
  end if;
end $$;

update public.places set restaurant_type = 'Standard' where restaurant_type is null;

-- 2. Site settings table (single row, id = 1)
create table if not exists public.app_settings (
  id integer primary key default 1,
  home_title text not null default 'MAKA - Work Hard, Eat Well',
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, home_title)
values (1, 'MAKA - Work Hard, Eat Well')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app settings are viewable by everyone" on public.app_settings;
create policy "app settings are viewable by everyone"
  on public.app_settings for select
  using (true);

drop policy if exists "only admins can update app settings" on public.app_settings;
create policy "only admins can update app settings"
  on public.app_settings for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
