-- When running this script, replace the admin@example.com placeholder with
-- the admin user's email. Keep the placeholder in the repository copy.

create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_content_updated_at on public.site_content;
create trigger set_site_content_updated_at
  before update on public.site_content
  for each row
  execute function public.set_site_content_updated_at();

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
  on public.site_content
  for select
  using (true);

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'email') = 'admin@example.com', false);
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

drop policy if exists "Configured admin can manage site content" on public.site_content;
create policy "Configured admin can manage site content"
  on public.site_content
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images"
  on storage.objects
  for select
  using (bucket_id = 'site-images');

drop policy if exists "Configured admin can upload site images" on storage.objects;
create policy "Configured admin can upload site images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-images'
    and public.is_site_admin()
  );

drop policy if exists "Configured admin can update site images" on storage.objects;
create policy "Configured admin can update site images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'site-images'
    and public.is_site_admin()
  )
  with check (
    bucket_id = 'site-images'
    and public.is_site_admin()
  );

drop policy if exists "Configured admin can delete site images" on storage.objects;
create policy "Configured admin can delete site images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'site-images'
    and public.is_site_admin()
  );
