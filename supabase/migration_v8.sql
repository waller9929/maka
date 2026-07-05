-- ==========================================================
-- Migration v8 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2~v7.sql).
--
-- This applies:
-- 1. A visit_logs table that records each homepage visit with the
--    signed-in user (or null for a guest) and a timestamp, so the
--    admin "Visitors" dashboard can break visits down by day and
--    by Google account.
-- ==========================================================

create table if not exists public.visit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id),
  visited_at timestamptz not null default now()
);

alter table public.visit_logs enable row level security;

drop policy if exists "only admins can view visit logs" on public.visit_logs;
create policy "only admins can view visit logs"
  on public.visit_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- No insert policy is defined on purpose — rows are only ever written
-- through log_home_visit() below, which (as a SECURITY DEFINER function
-- owned by the table owner) bypasses RLS the same way increment_visit_count()
-- already does.
create or replace function public.log_home_visit()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.app_settings set visit_count = visit_count + 1 where id = 1;
  insert into public.visit_logs (user_id, visited_at) values (auth.uid(), now());
end;
$$;

grant execute on function public.log_home_visit() to anon, authenticated;
