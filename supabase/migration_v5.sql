-- ==========================================================
-- Migration v5 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2/v3/v4.sql).
--
-- This applies:
-- 1. Allow comments without signing in (guest comments), with an
--    optional guest display name.
-- 2. Visitor counters: a site-wide page view count, and a
--    per-place view count.
-- ==========================================================

-- 1. Guest comments -----------------------------------------------

alter table public.comments alter column created_by drop not null;
alter table public.comments add column if not exists guest_name text;

drop policy if exists "authenticated users can insert comments" on public.comments;
drop policy if exists "anyone can insert comments" on public.comments;
create policy "anyone can insert comments"
  on public.comments for insert
  with check (
    (auth.uid() is not null and created_by = auth.uid())
    or (auth.uid() is null and created_by is null)
  );

-- Guests don't have a profile to award points to, and shouldn't block
-- the +1 the place owner gets when someone comments on their place.
create or replace function public.award_points_on_comment_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  place_owner uuid;
begin
  if new.created_by is not null then
    update public.profiles set points = points + 3 where id = new.created_by;
  end if;

  select created_by into place_owner from public.places where id = new.place_id;

  if place_owner is not null and (new.created_by is null or place_owner <> new.created_by) then
    update public.profiles set points = points + 1 where id = place_owner;
  end if;

  return new;
end;
$$;

-- 2. Visitor counters -----------------------------------------------

alter table public.app_settings add column if not exists visit_count bigint not null default 0;
alter table public.places add column if not exists view_count integer not null default 0;

create or replace function public.increment_visit_count()
returns void
language sql
security definer set search_path = public
as $$
  update public.app_settings set visit_count = visit_count + 1 where id = 1;
$$;

create or replace function public.increment_place_view(place_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.places set view_count = view_count + 1 where id = place_id;
$$;

grant execute on function public.increment_visit_count() to anon, authenticated;
grant execute on function public.increment_place_view(uuid) to anon, authenticated;
