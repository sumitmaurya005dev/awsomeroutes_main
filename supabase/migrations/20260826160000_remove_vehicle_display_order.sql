begin;

drop index if exists public.vehicle_categories_status_order_idx;
drop index if exists public.vehicle_models_category_status_idx;

alter table public.vehicle_categories
  drop column if exists display_order;

alter table public.vehicle_models
  drop column if exists display_order;

create index if not exists vehicle_categories_status_name_idx
  on public.vehicle_categories (status, name);

create index if not exists vehicle_models_category_status_name_idx
  on public.vehicle_models (category_id, status, name);

commit;
