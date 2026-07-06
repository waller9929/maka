-- ==========================================================
-- Migration v11 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2~v10.sql).
--
-- This applies:
-- 1. A new Board feature: board_posts + board_comments tables (Free /
--    Notice / Marketplace / QnA / Experience / News categories), with the
--    same guest-posting and points rules as the restaurant comments.
-- 2. An rss_feeds table (admin-managed RSS sources) and an
--    insert_news_article() function used by the "Indonesia news" crawler
--    to post summaries + source links into the News category.
-- 3. increment_board_post_view() for the board post view counter.
-- ==========================================================

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

drop policy if exists "board posts are viewable by everyone" on public.board_posts;
create policy "board posts are viewable by everyone"
  on public.board_posts for select
  using (true);

drop policy if exists "members and guests can insert non-notice non-news posts" on public.board_posts;
create policy "members and guests can insert non-notice non-news posts"
  on public.board_posts for insert
  with check (
    category in ('Free', 'Marketplace', 'QnA', 'Experience')
    and (
      (auth.uid() is not null and created_by = auth.uid())
      or (auth.uid() is null and created_by is null)
    )
  );

drop policy if exists "only admins can insert notice posts" on public.board_posts;
create policy "only admins can insert notice posts"
  on public.board_posts for insert
  with check (
    category = 'Notice'
    and created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "owners can update their own posts" on public.board_posts;
create policy "owners can update their own posts"
  on public.board_posts for update
  using (auth.uid() = created_by);

drop policy if exists "admins can update any post" on public.board_posts;
create policy "admins can update any post"
  on public.board_posts for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "only admins can delete posts" on public.board_posts;
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

drop policy if exists "board comments are viewable by everyone" on public.board_comments;
create policy "board comments are viewable by everyone"
  on public.board_comments for select
  using (true);

drop policy if exists "anyone can insert board comments" on public.board_comments;
create policy "anyone can insert board comments"
  on public.board_comments for insert
  with check (
    (auth.uid() is not null and created_by = auth.uid())
    or (auth.uid() is null and created_by is null)
  );

drop policy if exists "owners can update their own board comments" on public.board_comments;
create policy "owners can update their own board comments"
  on public.board_comments for update
  using (auth.uid() = created_by);

drop policy if exists "only admins can delete board comments" on public.board_comments;
create policy "only admins can delete board comments"
  on public.board_comments for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

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

create table if not exists public.rss_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null,
  created_at timestamptz not null default now()
);

alter table public.rss_feeds enable row level security;

drop policy if exists "only admins can view rss feeds" on public.rss_feeds;
create policy "only admins can view rss feeds"
  on public.rss_feeds for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "only admins can insert rss feeds" on public.rss_feeds;
create policy "only admins can insert rss feeds"
  on public.rss_feeds for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "only admins can delete rss feeds" on public.rss_feeds;
create policy "only admins can delete rss feeds"
  on public.rss_feeds for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

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
