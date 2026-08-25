begin;

create extension if not exists pgcrypto;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  permission_key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  phone text,
  role_id uuid references public.roles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'inactive')),
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email)) where email is not null;
create index if not exists profiles_role_status_idx
  on public.profiles (role_id, status);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  imagekit_file_id text not null unique,
  original_url text not null,
  file_path text not null,
  file_name text not null,
  original_file_name text,
  media_type text not null default 'image' check (media_type in ('image')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  folder text not null default '/awesomeroutes',
  alt_text text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  status text not null default 'active' check (status in ('active', 'archived')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_folder_status_created_idx
  on public.media_assets (folder, status, created_at desc);
create index if not exists media_assets_uploaded_by_idx
  on public.media_assets (uploaded_by) where uploaded_by is not null;
create index if not exists media_assets_public_status_idx
  on public.media_assets (is_public, status, created_at desc) where is_public;

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  iso_code text,
  phone_code text,
  description text,
  image_url text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists countries_slug_unique_idx on public.countries (lower(slug));
create unique index if not exists countries_iso_code_unique_idx on public.countries (upper(iso_code)) where iso_code is not null;
create index if not exists countries_status_name_idx on public.countries (status, name);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regions_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists regions_country_slug_unique_idx on public.regions (country_id, lower(slug));
create index if not exists regions_country_status_name_idx on public.regions (country_id, status, name);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete restrict,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  image_url text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists destinations_region_slug_unique_idx on public.destinations (region_id, lower(slug));
create index if not exists destinations_region_status_name_idx on public.destinations (region_id, status, name);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete restrict,
  parent_location_id uuid references public.locations(id) on delete restrict,
  name text not null,
  slug text not null,
  location_type text not null default 'place' check (location_type in ('place', 'activity_spot', 'attraction', 'other')),
  short_description text,
  description text,
  address text,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  image_url text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint locations_not_own_parent_check check (parent_location_id is null or parent_location_id <> id)
);

create unique index if not exists locations_destination_slug_unique_idx on public.locations (destination_id, lower(slug));
create index if not exists locations_destination_status_name_idx on public.locations (destination_id, status, name);
create index if not exists locations_parent_idx on public.locations (parent_location_id) where parent_location_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at before update on public.media_assets
for each row execute function public.set_updated_at();
drop trigger if exists countries_set_updated_at on public.countries;
create trigger countries_set_updated_at before update on public.countries
for each row execute function public.set_updated_at();
drop trigger if exists regions_set_updated_at on public.regions;
create trigger regions_set_updated_at before update on public.regions
for each row execute function public.set_updated_at();
drop trigger if exists destinations_set_updated_at on public.destinations;
create trigger destinations_set_updated_at before update on public.destinations
for each row execute function public.set_updated_at();
drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_updated_at();

insert into public.roles (name, slug, description)
values ('Super Admin', 'super_admin', 'Full platform administration access')
on conflict (slug) do nothing;

revoke all on table public.profiles, public.roles, public.permissions,
  public.role_permissions, public.media_assets, public.countries,
  public.regions, public.destinations, public.locations from anon, authenticated;

grant select on table public.profiles, public.roles, public.permissions,
  public.role_permissions to authenticated;
grant select, insert, update, delete on table public.media_assets,
  public.countries, public.regions, public.destinations, public.locations to authenticated;

commit;
