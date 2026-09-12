create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_users (email)
values ('keyoletoltu4@gmail.com')
on conflict (email) do nothing;

alter table public.prayer_requests
add column if not exists is_hidden boolean not null default false;

alter table public.testimonies
add column if not exists is_hidden boolean not null default false;

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id text,
  details text,
  created_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values ('daily_focus', '')
on conflict (key) do nothing;

update public.site_settings
set value = '', updated_at = now()
where key = 'daily_focus'
  and value = 'Peace, healing, provision, and renewed hope.';

insert into public.site_settings (key, value)
values ('quiet_time_video', 'https://www.youtube.com/embed/UfP1UkpRhSU')
on conflict (key) do nothing;

insert into public.site_settings (key, value)
values ('announcement', '')
on conflict (key) do nothing;

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.moderation_logs enable row level security;

create or replace function public.is_prayerpoint_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  );
$$;

grant execute on function public.is_prayerpoint_admin() to authenticated;

drop policy if exists "Admins can read their admin record" on public.admin_users;
drop policy if exists "Site settings are public" on public.site_settings;
drop policy if exists "Admins can update site settings" on public.site_settings;
drop policy if exists "Admins can insert site settings" on public.site_settings;
drop policy if exists "Admins can read moderation logs" on public.moderation_logs;
drop policy if exists "Admins can create moderation logs" on public.moderation_logs;
drop policy if exists "Admins can read all prayer requests" on public.prayer_requests;
drop policy if exists "Admins can hide prayer requests" on public.prayer_requests;
drop policy if exists "Admins can delete prayer requests" on public.prayer_requests;
drop policy if exists "Admins can read all testimonies" on public.testimonies;
drop policy if exists "Admins can hide testimonies" on public.testimonies;
drop policy if exists "Admins can delete testimonies" on public.testimonies;

create policy "Admins can read their admin record"
on public.admin_users for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

create policy "Site settings are public"
on public.site_settings for select
to anon, authenticated
using (true);

create policy "Admins can update site settings"
on public.site_settings for update
to authenticated
using (public.is_prayerpoint_admin())
with check (public.is_prayerpoint_admin());

create policy "Admins can insert site settings"
on public.site_settings for insert
to authenticated
with check (public.is_prayerpoint_admin());

create policy "Admins can read moderation logs"
on public.moderation_logs for select
to authenticated
using (public.is_prayerpoint_admin());

create policy "Admins can create moderation logs"
on public.moderation_logs for insert
to authenticated
with check (public.is_prayerpoint_admin());

drop policy if exists "Prayer requests are public" on public.prayer_requests;
create policy "Prayer requests are public"
on public.prayer_requests for select
to anon, authenticated
using (is_hidden = false);

create policy "Admins can read all prayer requests"
on public.prayer_requests for select
to authenticated
using (public.is_prayerpoint_admin());

create policy "Admins can hide prayer requests"
on public.prayer_requests for update
to authenticated
using (public.is_prayerpoint_admin())
with check (public.is_prayerpoint_admin());

create policy "Admins can delete prayer requests"
on public.prayer_requests for delete
to authenticated
using (public.is_prayerpoint_admin());

drop policy if exists "Testimonies are public" on public.testimonies;
create policy "Testimonies are public"
on public.testimonies for select
to anon, authenticated
using (is_hidden = false);

create policy "Admins can read all testimonies"
on public.testimonies for select
to authenticated
using (public.is_prayerpoint_admin());

create policy "Admins can hide testimonies"
on public.testimonies for update
to authenticated
using (public.is_prayerpoint_admin())
with check (public.is_prayerpoint_admin());

create policy "Admins can delete testimonies"
on public.testimonies for delete
to authenticated
using (public.is_prayerpoint_admin());
