-- ==========================================================
-- MAKA 맛집 공유 사이트 - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행하세요.
-- ==========================================================

-- 1. profiles 테이블: auth.users 가 생성될 때 자동으로 행이 만들어집니다.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  points integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update own profile (name/avatar only via app logic)"
  on public.profiles for update
  using (auth.uid() = id);

-- 신규 로그인 사용자가 생기면 profiles 에 자동으로 행 생성
-- waller9929@gmail.com 은 관리자로 자동 지정됩니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    (new.email = 'waller9929@gmail.com')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. places 테이블 (맛집 등록)
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  category text not null,
  rating numeric(2,1) not null default 0,
  value_rating numeric(2,1) not null default 0,
  price_range text,
  visit_date date,
  photo_url text,
  menu_photo_url text,
  time_tags text[] not null default '{}',       -- 점심 / 저녁 / 주말
  companion_tags text[] not null default '{}',  -- 가족과 함께 / 혼자서 / 친구·동료와 함께
  comment text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places enable row level security;

create policy "places are viewable by everyone"
  on public.places for select
  using (true);

create policy "authenticated users can insert places"
  on public.places for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "owners can update their own places"
  on public.places for update
  using (auth.uid() = created_by);

create policy "only admins can delete places"
  on public.places for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 3. comments 테이블
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  content text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "authenticated users can insert comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "owners can update their own comments"
  on public.comments for update
  using (auth.uid() = created_by);

create policy "only admins can delete comments"
  on public.comments for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 4. 포인트 트리거
-- 맛집 등록 +10
create or replace function public.award_points_on_place_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set points = points + 10 where id = new.created_by;
  return new;
end;
$$;

drop trigger if exists on_place_created on public.places;
create trigger on_place_created
  after insert on public.places
  for each row execute procedure public.award_points_on_place_insert();

-- 댓글 작성 +3, 내 글에 다른 사람이 댓글 달면 글쓴이 +1
create or replace function public.award_points_on_comment_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  place_owner uuid;
begin
  update public.profiles set points = points + 3 where id = new.created_by;

  select created_by into place_owner from public.places where id = new.place_id;

  if place_owner is not null and place_owner <> new.created_by then
    update public.profiles set points = points + 1 where id = place_owner;
  end if;

  return new;
end;
$$;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.award_points_on_comment_insert();

-- 5. 레벨 계산 함수 (프론트에서도 lib/level.ts 로 동일 로직 사용)
create or replace function public.get_level(pts integer)
returns text
language sql
immutable
as $$
  select case
    when pts >= 200 then 'Lv5 맛집전설'
    when pts >= 100 then 'Lv4 미식마스터'
    when pts >= 50 then 'Lv3 맛집헌터'
    when pts >= 20 then 'Lv2 미식가'
    else 'Lv1 새싹'
  end;
$$;

-- 6. 리더보드 뷰
create or replace view public.leaderboard as
select
  id, name, email, avatar_url, points,
  public.get_level(points) as level,
  (select count(*) from public.places pl where pl.created_by = profiles.id) as place_count,
  (select count(*) from public.comments c where c.created_by = profiles.id) as comment_count
from public.profiles
order by points desc, created_at asc;

-- ==========================================================
-- Storage 버킷 (사진 / 메뉴판 업로드)
-- SQL Editor 에서 실행하거나, 대시보드 Storage 메뉴에서
-- "place-photos" 버킷을 Public 으로 직접 만들어도 됩니다.
-- ==========================================================
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

create policy "place photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'place-photos');

create policy "authenticated users can upload place photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'place-photos');
