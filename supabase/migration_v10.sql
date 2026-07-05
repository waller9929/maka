-- ==========================================================
-- Migration v10 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2~v9.sql).
--
-- This applies:
-- 1. A base_rating column on places — this becomes the field the admin
--    edits in Manage places from now on (renamed from the old plain
--    "rating" input). The existing rating value is copied into it once,
--    so nothing changes visually until real comment ratings come in.
-- 2. rating and image_urls columns on comments, so people can optionally
--    rate (1-5) and attach up to a few photos to a comment.
-- 3. A trigger that automatically recalculates each place's overall
--    rating as a weighted average of base_rating (treated as one
--    "virtual" comment) and every comment rating left on it.
-- 4. Storage upload permission opened up to guests too, so a guest
--    comment can include photos the same way a guest comment already
--    works today.
-- ==========================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places' and column_name = 'base_rating'
  ) then
    alter table public.places add column base_rating numeric(2,1) not null default 0;
    update public.places set base_rating = rating;
  end if;
end $$;

alter table public.comments add column if not exists rating smallint check (rating between 1 and 5);
alter table public.comments add column if not exists image_urls text[] not null default '{}';

create or replace function public.recalc_place_rating(target_place_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  base numeric;
  rating_sum numeric;
  rating_cnt integer;
begin
  select base_rating into base from public.places where id = target_place_id;
  if base is null then
    return;
  end if;

  select coalesce(sum(rating), 0), count(rating)
    into rating_sum, rating_cnt
    from public.comments
    where place_id = target_place_id and rating is not null;

  update public.places
    set rating = round((base + rating_sum) / (1 + rating_cnt), 1)
    where id = target_place_id;
end;
$$;

create or replace function public.trg_comments_recalc_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recalc_place_rating(old.place_id);
    return old;
  else
    perform public.recalc_place_rating(new.place_id);
    return new;
  end if;
end;
$$;

drop trigger if exists on_comment_change_recalc_rating on public.comments;
create trigger on_comment_change_recalc_rating
  after insert or delete or update of rating on public.comments
  for each row execute procedure public.trg_comments_recalc_rating();

create or replace function public.trg_places_base_rating_recalc()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.recalc_place_rating(new.id);
  return new;
end;
$$;

drop trigger if exists on_place_base_rating_change on public.places;
create trigger on_place_base_rating_change
  after update of base_rating on public.places
  for each row execute procedure public.trg_places_base_rating_recalc();

create or replace function public.trg_places_before_insert_rating()
returns trigger
language plpgsql
as $$
begin
  new.rating := new.base_rating;
  return new;
end;
$$;

drop trigger if exists on_place_insert_set_rating on public.places;
create trigger on_place_insert_set_rating
  before insert on public.places
  for each row execute procedure public.trg_places_before_insert_rating();

drop policy if exists "authenticated users can upload place photos" on storage.objects;
drop policy if exists "anyone can upload place photos" on storage.objects;
create policy "anyone can upload place photos"
  on storage.objects for insert
  with check (bucket_id = 'place-photos');
