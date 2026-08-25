-- Keep the activity location combobox responsive as the locations table grows.
create extension if not exists pg_trgm with schema extensions;

create index if not exists locations_active_name_trgm_idx
  on public.locations
  using gin (name extensions.gin_trgm_ops)
  where status = 'active';
