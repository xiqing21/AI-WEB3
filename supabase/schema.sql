-- Run this in the Supabase SQL Editor.
-- It creates the paid newsletter schema, permissive RLS, public post views,
-- storage policies, profile bootstrap trigger, and the two performance indexes.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 140),
  cover_path text,
  body text not null check (char_length(body) > 0),
  price_mon numeric not null default 0 check (price_mon >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  tx_hash text not null unique,
  paid_amount_mon numeric not null check (paid_amount_mon >= 0),
  created_at timestamptz not null default now(),
  unique (subscriber_id, creator_id)
);

create index if not exists posts_creator_created_idx
  on public.posts (creator_id, created_at desc);

create index if not exists subscriptions_subscriber_creator_idx
  on public.subscriptions (subscriber_id, creator_id);

create index if not exists subscriptions_creator_idx
  on public.subscriptions (creator_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "subscriptions are readable for checks" on public.subscriptions;
create policy "subscriptions are readable for checks"
  on public.subscriptions for select
  using (true);

drop policy if exists "subscribers insert own subscriptions" on public.subscriptions;
create policy "subscribers insert own subscriptions"
  on public.subscriptions for insert
  with check (subscriber_id = (select auth.uid()));

drop policy if exists "subscribers update own subscriptions" on public.subscriptions;
create policy "subscribers update own subscriptions"
  on public.subscriptions for update
  using (subscriber_id = (select auth.uid()))
  with check (subscriber_id = (select auth.uid()));

drop policy if exists "subscribers delete own subscriptions" on public.subscriptions;
create policy "subscribers delete own subscriptions"
  on public.subscriptions for delete
  using (subscriber_id = (select auth.uid()));

-- Public readers use this view for feed/card data. App queries only
-- id, title, cover_path, and created_at from it for paginated feeds.
create or replace view public.public_posts as
select
  id,
  creator_id,
  title,
  cover_path,
  created_at
from public.posts;

grant select on public.public_posts to anon, authenticated;

-- Separate public pricing view for the profile subscribe button.
create or replace view public.creator_pass_prices as
select
  creator_id,
  coalesce(min(nullif(price_mon, 0)), max(price_mon), 0.1)::text as price_mon
from public.posts
group by creator_id;

grant select on public.creator_pass_prices to anon, authenticated;

-- Body access is gated through direct reads of public.posts.
drop policy if exists "posts select only creator or subscriber can read body" on public.posts;
create policy "posts select only creator or subscriber can read body"
  on public.posts for select
  using (
    creator_id = (select auth.uid())
    or exists (
      select 1
      from public.subscriptions s
      where s.creator_id = posts.creator_id
        and s.subscriber_id = (select auth.uid())
    )
  );

drop policy if exists "creators insert own posts" on public.posts;
create policy "creators insert own posts"
  on public.posts for insert
  with check (creator_id = (select auth.uid()));

drop policy if exists "creators update own posts" on public.posts;
create policy "creators update own posts"
  on public.posts for update
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

drop policy if exists "creators delete own posts" on public.posts;
create policy "creators delete own posts"
  on public.posts for delete
  using (creator_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('post-covers', 'post-covers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read post covers" on storage.objects;

drop policy if exists "creators upload own jpg covers" on storage.objects;
create policy "creators upload own jpg covers"
  on storage.objects for insert
  with check (
    bucket_id = 'post-covers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and lower(right(name, 4)) = '.jpg'
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, wallet_address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'wallet_address'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.subscriber_emails_for_creator(p_creator_id uuid)
returns table(email text)
language sql
security definer
set search_path = public, auth
as $$
  select u.email
  from public.subscriptions s
  join auth.users u on u.id = s.subscriber_id
  where s.creator_id = p_creator_id
    and u.email is not null;
$$;

revoke all on function public.subscriber_emails_for_creator(uuid) from public, anon, authenticated;
grant execute on function public.subscriber_emails_for_creator(uuid) to service_role;

-- Optional demo data helper:
-- 1. Sign up once in the app.
-- 2. Copy your auth user id.
-- 3. Replace the UUID below and run the insert.
--
-- insert into public.posts (creator_id, title, cover_path, body, price_mon)
-- values
-- ('00000000-0000-0000-0000-000000000000', 'Political risk is becoming an API problem', null, 'Paid analysis preview: election narratives now move through dashboards, prediction markets, and private research feeds.', 0.1),
-- ('00000000-0000-0000-0000-000000000000', 'Funding spreads, MON liquidity, and the creator economy', null, 'Paid analysis preview: the same treasury habits used for trading desks are arriving inside newsletter subscriptions.', 0.12),
-- ('00000000-0000-0000-0000-000000000000', 'Web3 paid media needs receipts, not promises', null, 'Paid analysis preview: wallet-native payments make access checks explainable and auditable.', 0.08),
-- ('00000000-0000-0000-0000-000000000000', 'Big data feeds are turning into paywall infrastructure', null, 'Paid analysis preview: the real bottleneck is no longer storage, it is low-latency entitlement checks.', 0.1);
