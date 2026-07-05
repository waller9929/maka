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
  restaurant_type text,
  photo_url text,
  menu_photo_url text,
  google_maps_url text,
  time_tags text[] not null default '{}',       -- Lunch / Dinner / Weekend
  companion_tags text[] not null default '{}',  -- With family / Solo / With friends-colleagues
  comment text,
  view_count integer not null default 0,
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

-- 3. comments 테이블 (created_by is nullable — guests can comment
--    without signing in, using an optional guest_name instead)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  content text not null,
  created_by uuid references public.profiles(id),
  guest_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "anyone can insert comments"
  on public.comments for insert
  with check (
    (auth.uid() is not null and created_by = auth.uid())
    or (auth.uid() is null and created_by is null)
  );

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

-- 댓글 작성 +3 (로그인한 사용자만), 내 글에 다른 사람(또는 게스트)이
-- 댓글 달면 글쓴이 +1
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

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.award_points_on_comment_insert();

-- 5. Level calculation function (same logic mirrored in lib/level.ts on the frontend)
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

-- 6. 리더보드 뷰
create or replace view public.leaderboard as
select
  id, name, email, avatar_url, points,
  public.get_level(points) as level,
  (select count(*) from public.places pl where pl.created_by = profiles.id) as place_count,
  (select count(*) from public.comments c where c.created_by = profiles.id) as comment_count
from public.profiles
order by points desc, created_at asc;

-- 7. 사이트 설정 (관리자가 홈페이지 타이틀을 수정할 수 있도록 하는 단일 행 테이블)
create table if not exists public.app_settings (
  id integer primary key default 1,
  home_title text not null default 'MAKA - Work Hard, Eat Well',
  visit_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, home_title)
values (1, 'MAKA - Work Hard, Eat Well')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "app settings are viewable by everyone"
  on public.app_settings for select
  using (true);

create policy "only admins can update app settings"
  on public.app_settings for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 8. 방문자 카운트 (사이트 전체 페이지뷰 + 맛집별 조회수)
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

-- 9. 숨겨진 "월 식단표" 페이지 (홈페이지 우측 하단의 눈에 잘 안 띄는
--    버튼으로 접속, 비밀번호 입력 후 열람 가능)
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

create policy "only admins can view secret page settings"
  on public.secret_page for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "only admins can update secret page settings"
  on public.secret_page for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Checks the password server-side and returns the meal plan URL only if
-- it matches — the stored password is never sent to the client.
create or replace function public.get_meal_plan(input_password text)
returns text
language sql
security definer set search_path = public
as $$
  select meal_plan_url from public.secret_page
  where id = 1 and password = input_password;
$$;

grant execute on function public.get_meal_plan(text) to anon, authenticated;

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
