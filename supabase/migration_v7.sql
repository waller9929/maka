-- ==========================================================
-- Migration v7 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2~v6.sql).
--
-- This applies:
-- 1. A hidden "monthly meal plan" page, gated by a password that
--    the admin can set from Site settings. The password itself is
--    never exposed to the browser — a security-definer function
--    checks it server-side and only returns the meal plan image
--    URL when the password matches.
-- ==========================================================

create table if not exists public.secret_page (
  id integer primary key default 1,
  password text not null default 'maka2026',
  meal_plan_url text,
  updated_at timestamptz not null default now(),
  constraint secret_page_singleton check (id = 1)
);

insert into public.secret_page (id, password)
values (1, 'maka2026')
on conflict (id) do nothing;

alter table public.secret_page enable row level security;

-- Only admins can read/update this table directly (used by the Site
-- settings screen). Regular visitors never query this table — they
-- go through the get_meal_plan() function instead.
drop policy if exists "only admins can view secret page settings" on public.secret_page;
create policy "only admins can view secret page settings"
  on public.secret_page for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "only admins can update secret page settings" on public.secret_page;
create policy "only admins can update secret page settings"
  on public.secret_page for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Checks the given password server-side and returns the meal plan URL
-- only if it matches — the stored password is never sent to the client.
create or replace function public.get_meal_plan(input_password text)
returns text
language sql
security definer set search_path = public
as $$
  select meal_plan_url from public.secret_page
  where id = 1 and password = input_password;
$$;

grant execute on function public.get_meal_plan(text) to anon, authenticated;
