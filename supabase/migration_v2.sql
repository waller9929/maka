-- ==========================================================
-- Migration v2 — run this in the Supabase SQL Editor on your
-- EXISTING project (you already ran schema.sql once before).
--
-- This applies:
-- 1. Remove visit date, add google_maps_url column
-- 2. Update the level function to English level names
-- 3. Translate any existing Korean category/price/tag values
--    to their English equivalents, so old rows stay consistent
--    with the new English UI.
-- ==========================================================

-- 1. Column changes
alter table public.places drop column if exists visit_date;
alter table public.places add column if not exists google_maps_url text;

-- 2. English level names
create or replace function public.get_level(pts integer)
returns text
language sql
immutable
as $$
  select case
    when pts >= 200 then 'Lv5 Legend'
    when pts >= 100 then 'Lv4 Gourmet Master'
    when pts >= 50 then 'Lv3 Hunter'
    when pts >= 20 then 'Lv2 Foodie'
    else 'Lv1 Sprout'
  end;
$$;

-- 3. Translate existing data (safe to run more than once)
update public.places set category = 'Korean' where category = '한식';
update public.places set category = 'Chinese' where category = '중식';
update public.places set category = 'Japanese' where category = '일식';
update public.places set category = 'Western' where category = '양식';
update public.places set category = 'Cafe/Dessert' where category = '카페·디저트';
update public.places set category = 'Other' where category = '기타';

update public.places set price_range = 'Under $10' where price_range = '1만원 이하';
update public.places set price_range = '$10-20' where price_range = '1~2만원';
update public.places set price_range = '$20-30' where price_range = '2~3만원';
update public.places set price_range = 'Over $30' where price_range = '3만원 이상';

update public.places
set time_tags = array(
  select case t
    when '점심' then 'Lunch'
    when '저녁' then 'Dinner'
    when '주말' then 'Weekend'
    else t
  end
  from unnest(time_tags) as t
)
where time_tags && array['점심','저녁','주말'];

update public.places
set companion_tags = array(
  select case t
    when '가족과 함께' then 'With family'
    when '혼자서' then 'Solo'
    when '친구·동료와 함께' then 'With friends/colleagues'
    else t
  end
  from unnest(companion_tags) as t
)
where companion_tags && array['가족과 함께','혼자서','친구·동료와 함께'];
