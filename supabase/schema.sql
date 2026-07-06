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
  base_rating numeric(2,1) not null default 0,
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
  rating smallint check (rating between 1 and 5),
  image_urls text[] not null default '{}',
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

-- 4b. 맛집 rating 자동 계산 — 관리자가 Manage places 에서 입력한 base_rating을
-- "가상 댓글 1개"로 취급하고, 별점을 남긴 실제 댓글들과 가중평균을 냅니다.
-- overall_rating = (base_rating + sum(comment ratings)) / (1 + count(comment ratings))
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

-- Admin edits to base_rating (via Manage places) should also feed back
-- into the computed rating shown across the site.
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

-- New places have no comments yet, so rating simply mirrors base_rating at insert time.
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

-- 8b. 방문 로그 (일별/사용자별 방문자 대시보드용)
create table if not exists public.visit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id),
  visited_at timestamptz not null default now()
);

alter table public.visit_logs enable row level security;

create policy "only admins can view visit logs"
  on public.visit_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- No insert policy on purpose — rows are only ever written through
-- log_home_visit(), which bypasses RLS the same way increment_visit_count() does.
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

-- 10. 협찬 광고 (홈페이지 필터바 위에 한 자리만 노출되는 배너,
--     게재 기간이 지나면 자동으로 노출에서 빠집니다)
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

create policy "sponsored ads are viewable by everyone"
  on public.sponsored_ads for select
  using (true);

create policy "only admins can insert sponsored ads"
  on public.sponsored_ads for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "only admins can update sponsored ads"
  on public.sponsored_ads for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "only admins can delete sponsored ads"
  on public.sponsored_ads for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 11. 게시판 (자유게시판 / 공지사항 / 중고거래·나눔장터 / Q&A / 인니 소식 / 식당 경험담)
-- Notice는 관리자만 작성 가능, News는 RSS 크롤러(insert_news_article 함수)를 통해서만
-- 채워지고 클라이언트가 직접 쓸 수 없습니다. 나머지 카테고리는 맛집 댓글처럼
-- 비로그인 게스트도 이름만 선택 입력하고 작성할 수 있습니다.
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  image_urls text[] not null default '{}',
  source_name text,
  source_url text,
  pinned boolean not null default false,
  view_count integer not null default 0,
  created_by uuid references public.profiles(id),
  guest_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_posts enable row level security;

create policy "board posts are viewable by everyone"
  on public.board_posts for select
  using (true);

create policy "members and guests can insert non-notice non-news posts"
  on public.board_posts for insert
  with check (
    category in ('Free', 'Marketplace', 'QnA', 'Experience')
    and (
      (auth.uid() is not null and created_by = auth.uid())
      or (auth.uid() is null and created_by is null)
    )
  );

create policy "only admins can insert notice posts"
  on public.board_posts for insert
  with check (
    category = 'Notice'
    and created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "owners can update their own posts"
  on public.board_posts for update
  using (auth.uid() = created_by);

create policy "admins can update any post"
  on public.board_posts for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "only admins can delete posts"
  on public.board_posts for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create table if not exists public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  content text not null,
  created_by uuid references public.profiles(id),
  guest_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_comments enable row level security;

create policy "board comments are viewable by everyone"
  on public.board_comments for select
  using (true);

create policy "anyone can insert board comments"
  on public.board_comments for insert
  with check (
    (auth.uid() is not null and created_by = auth.uid())
    or (auth.uid() is null and created_by is null)
  );

create policy "owners can update their own board comments"
  on public.board_comments for update
  using (auth.uid() = created_by);

create policy "only admins can delete board comments"
  on public.board_comments for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 게시글 작성 +10 (로그인 사용자만), 댓글 작성 +3, 내 글에 댓글 달리면 +1
-- (맛집 포인트 정책과 동일한 기준)
create or replace function public.award_points_on_board_post_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.created_by is not null then
    update public.profiles set points = points + 10 where id = new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_board_post_created on public.board_posts;
create trigger on_board_post_created
  after insert on public.board_posts
  for each row execute procedure public.award_points_on_board_post_insert();

create or replace function public.award_points_on_board_comment_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_owner uuid;
begin
  if new.created_by is not null then
    update public.profiles set points = points + 3 where id = new.created_by;
  end if;

  select created_by into post_owner from public.board_posts where id = new.post_id;

  if post_owner is not null and (new.created_by is null or post_owner <> new.created_by) then
    update public.profiles set points = points + 1 where id = post_owner;
  end if;

  return new;
end;
$$;

drop trigger if exists on_board_comment_created on public.board_comments;
create trigger on_board_comment_created
  after insert on public.board_comments
  for each row execute procedure public.award_points_on_board_comment_insert();

-- "인니 소식" 게시판에 쓸 RSS 피드 소스 목록 (관리자가 Admin > Board 화면에서 관리)
create table if not exists public.rss_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null,
  created_at timestamptz not null default now()
);

alter table public.rss_feeds enable row level security;

create policy "only admins can view rss feeds"
  on public.rss_feeds for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "only admins can insert rss feeds"
  on public.rss_feeds for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "only admins can delete rss feeds"
  on public.rss_feeds for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Called only by the /api/cron/fetch-news route (with the anon key) to insert
-- a News-category board post. Bypasses RLS as a SECURITY DEFINER function,
-- the same pattern used by log_home_visit()/get_meal_plan(). Skips articles
-- that were already inserted (matched by source_url) so re-running the cron
-- doesn't create duplicates.
create or replace function public.insert_news_article(
  p_title text,
  p_content text,
  p_source_name text,
  p_source_url text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_source_url is not null and exists (
    select 1 from public.board_posts where category = 'News' and source_url = p_source_url
  ) then
    return null;
  end if;

  insert into public.board_posts (category, title, content, source_name, source_url, created_by, guest_name)
  values ('News', p_title, p_content, p_source_name, p_source_url, null, p_source_name)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.insert_news_article(text, text, text, text) to anon, authenticated;

create or replace function public.increment_board_post_view(post_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.board_posts set view_count = view_count + 1 where id = post_id;
$$;

grant execute on function public.increment_board_post_view(uuid) to anon, authenticated;

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

-- Not restricted to authenticated users: guests can attach photos to
-- comments too, the same way they can already post guest comments.
create policy "anyone can upload place photos"
  on storage.objects for insert
  with check (bucket_id = 'place-photos');
