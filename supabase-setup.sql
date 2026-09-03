create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous',
  category text,
  message text not null,
  open_to_connect boolean not null default true,
  prayers integer not null default 0,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.prayer_requests
add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

update public.prayer_requests
set expires_at = created_at + interval '7 days'
where expires_at is null;

create table if not exists public.encouragements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.prayer_requests(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'A PrayerPoint member',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous',
  message text not null,
  love_count integer not null default 0,
  celebrate_count integer not null default 0,
  amen_count integer not null default 0,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.testimonies
add column if not exists love_count integer not null default 0;

alter table public.testimonies
add column if not exists celebrate_count integer not null default 0;

alter table public.testimonies
add column if not exists amen_count integer not null default 0;

alter table public.testimonies
add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

update public.testimonies
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.profiles enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.encouragements enable row level security;
alter table public.testimonies enable row level security;

drop policy if exists "Profiles are visible to signed in users" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Prayer requests are public" on public.prayer_requests;
drop policy if exists "Signed in users can create prayer requests" on public.prayer_requests;
drop policy if exists "Users can edit their own prayer requests" on public.prayer_requests;
drop policy if exists "Users can delete their own prayer requests" on public.prayer_requests;
drop policy if exists "Users can read encouragement sent to or by them" on public.encouragements;
drop policy if exists "Signed in users can send encouragement" on public.encouragements;
drop policy if exists "Users can remove encouragement sent to or by them" on public.encouragements;
drop policy if exists "Testimonies are public" on public.testimonies;
drop policy if exists "Signed in users can share testimonies" on public.testimonies;
drop policy if exists "Users can edit their own testimonies" on public.testimonies;
drop policy if exists "Users can delete their own testimonies" on public.testimonies;

create policy "Profiles are visible to signed in users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Prayer requests are public"
on public.prayer_requests for select
to anon, authenticated
using (true);

create policy "Signed in users can create prayer requests"
on public.prayer_requests for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can edit their own prayer requests"
on public.prayer_requests for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own prayer requests"
on public.prayer_requests for delete
to authenticated
using (user_id = auth.uid());

create policy "Testimonies are public"
on public.testimonies for select
to anon, authenticated
using (true);

create policy "Signed in users can share testimonies"
on public.testimonies for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can edit their own testimonies"
on public.testimonies for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own testimonies"
on public.testimonies for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.increment_testimony_reaction(
  testimony_id uuid,
  reaction_name text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.testimonies
  set
    love_count = case when reaction_name = 'love' then love_count + 1 else love_count end,
    celebrate_count = case when reaction_name = 'celebrate' then celebrate_count + 1 else celebrate_count end,
    amen_count = case when reaction_name = 'amen' then amen_count + 1 else amen_count end
  where id = testimony_id
    and reaction_name in ('love', 'celebrate', 'amen');
$$;

grant execute on function public.increment_testimony_reaction(uuid, text) to anon, authenticated;

create policy "Users can read encouragement sent to or by them"
on public.encouragements for select
to authenticated
using (recipient_id = auth.uid() or sender_id = auth.uid());

create policy "Signed in users can send encouragement"
on public.encouragements for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.prayer_requests
    where prayer_requests.id = request_id
      and prayer_requests.user_id = recipient_id
      and prayer_requests.open_to_connect = true
  )
);

create policy "Users can remove encouragement sent to or by them"
on public.encouragements for delete
to authenticated
using (recipient_id = auth.uid() or sender_id = auth.uid());

create or replace function public.increment_prayer_count(request_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.prayer_requests
  set prayers = prayers + 1
  where id = request_id;
$$;

grant execute on function public.increment_prayer_count(uuid) to anon, authenticated;

create or replace function public.decrement_prayer_count(request_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.prayer_requests
  set prayers = greatest(prayers - 1, 0)
  where id = request_id;
$$;

grant execute on function public.decrement_prayer_count(uuid) to anon, authenticated;
