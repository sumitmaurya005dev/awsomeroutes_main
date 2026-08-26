begin;

insert into public.permissions (module, action, permission_key, description) values
  ('vehicles','view','vehicles.view','View vehicle catalog, vendors, fleet, drivers and rates'),
  ('vehicles','create','vehicles.create','Create vehicle catalog and operational records'),
  ('vehicles','update','vehicles.update','Update vehicle catalog and operational records'),
  ('vehicles','delete','vehicles.delete','Delete unused vehicle records'),
  ('vehicles','manage_pricing','vehicles.manage_pricing','Manage location, model and vendor vehicle rates'),
  ('vehicles','assign','vehicles.assign','Assign vehicles and drivers to tour operations')
on conflict (permission_key) do update set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.slug = 'super_admin' and permission.module = 'vehicles'
on conflict do nothing;

create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null,
  description text check (description is null or char_length(description) <= 1000),
  default_seating_capacity smallint not null check (default_seating_capacity between 1 and 60),
  default_comfort_capacity smallint not null check (
    default_comfort_capacity between 1 and default_seating_capacity
  ),
  default_luggage_capacity smallint not null default 0 check (default_luggage_capacity between 0 and 100),
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_categories_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index vehicle_categories_name_uidx on public.vehicle_categories (lower(name));
create unique index vehicle_categories_slug_uidx on public.vehicle_categories (lower(slug));
create index vehicle_categories_status_order_idx on public.vehicle_categories (status, display_order, name);

insert into public.vehicle_categories
  (name, slug, default_seating_capacity, default_comfort_capacity, default_luggage_capacity, display_order)
values
  ('Sedan','sedan',4,3,3,10),
  ('MPV','mpv',7,6,5,20),
  ('SUV','suv',7,5,5,30),
  ('Tempo Traveller','tempo-traveller',12,10,10,40),
  ('Urbania','urbania',17,13,14,50)
on conflict do nothing;

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vehicle_categories(id) on delete restrict,
  manufacturer text check (manufacturer is null or char_length(manufacturer) <= 100),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null,
  description text check (description is null or char_length(description) <= 2000),
  seating_capacity smallint not null check (seating_capacity between 1 and 60),
  comfort_capacity smallint not null check (comfort_capacity between 1 and seating_capacity),
  luggage_capacity smallint not null default 0 check (luggage_capacity between 0 and 100),
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_models_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index vehicle_models_category_slug_uidx on public.vehicle_models (category_id, lower(slug));
create index vehicle_models_category_status_idx on public.vehicle_models (category_id, status, display_order, name);

insert into public.vehicle_models
  (category_id, manufacturer, name, slug, seating_capacity, comfort_capacity, luggage_capacity, display_order)
select category.id, seed.manufacturer, seed.name, seed.slug,
  seed.seating_capacity, seed.comfort_capacity, seed.luggage_capacity, seed.display_order
from public.vehicle_categories category
join (values
  ('mpv','Maruti Suzuki','Ertiga','ertiga',6,5,4,10),
  ('mpv','Toyota','Innova','innova',7,6,5,20),
  ('mpv','Toyota','Innova Crysta','innova-crysta',7,6,5,30),
  ('sedan','Maruti Suzuki','Dzire','dzire',4,3,3,10),
  ('tempo-traveller','Force Motors','Traveller 9 Seater','traveller-9-seater',9,8,8,10),
  ('urbania','Force Motors','Urbania 13 Seater','urbania-13-seater',13,11,12,10)
) as seed(category_slug, manufacturer, name, slug, seating_capacity, comfort_capacity, luggage_capacity, display_order)
  on category.slug = seed.category_slug
on conflict do nothing;

create table public.transport_vendors (
  id uuid primary key default gen_random_uuid(),
  base_location_id uuid not null references public.locations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null,
  contact_person text check (contact_person is null or char_length(contact_person) <= 160),
  phone text check (phone is null or char_length(phone) <= 40),
  alternate_phone text check (alternate_phone is null or char_length(alternate_phone) <= 40),
  email text check (email is null or char_length(email) <= 254),
  address text check (address is null or char_length(address) <= 1000),
  notes text check (notes is null or char_length(notes) <= 3000),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_vendors_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index transport_vendors_location_slug_uidx on public.transport_vendors (base_location_id, lower(slug));
create index transport_vendors_location_status_idx on public.transport_vendors (base_location_id, status, name);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.transport_vendors(id) on delete restrict,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text check (last_name is null or char_length(last_name) <= 100),
  phone text not null check (char_length(phone) between 7 and 40),
  alternate_phone text check (alternate_phone is null or char_length(alternate_phone) <= 40),
  licence_number text check (licence_number is null or char_length(licence_number) <= 80),
  licence_expiry date,
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'active' check (status in ('active','inactive','unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index drivers_licence_uidx on public.drivers (lower(licence_number)) where licence_number is not null;
create index drivers_vendor_status_name_idx on public.drivers (vendor_id, status, first_name, last_name);

create table public.fleet_vehicles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.transport_vendors(id) on delete restrict,
  model_id uuid not null references public.vehicle_models(id) on delete restrict,
  registration_number text not null check (char_length(registration_number) between 4 and 30),
  color text check (color is null or char_length(color) <= 60),
  manufacture_year smallint check (manufacture_year is null or manufacture_year between 1980 and 2200),
  seating_capacity smallint check (seating_capacity is null or seating_capacity between 1 and 60),
  comfort_capacity smallint check (
    comfort_capacity is null or comfort_capacity between 1 and coalesce(seating_capacity, 60)
  ),
  luggage_capacity smallint check (luggage_capacity is null or luggage_capacity between 0 and 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'active' check (status in ('active','inactive','maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index fleet_vehicles_registration_uidx on public.fleet_vehicles (upper(registration_number));
create index fleet_vehicles_vendor_status_idx on public.fleet_vehicles (vendor_id, status, model_id);
create index fleet_vehicles_model_status_idx on public.fleet_vehicles (model_id, status);

create table public.vehicle_rate_cards (
  id uuid primary key default gen_random_uuid(),
  base_location_id uuid not null references public.locations(id) on delete restrict,
  category_id uuid not null references public.vehicle_categories(id) on delete restrict,
  model_id uuid references public.vehicle_models(id) on delete restrict,
  vendor_id uuid references public.transport_vendors(id) on delete restrict,
  daily_rate_paise bigint not null check (daily_rate_paise between 0 and 100000000000),
  currency text not null default 'INR' check (currency = 'INR'),
  all_inclusive boolean not null default true check (all_inclusive),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vehicle_rates_category_default_uidx
  on public.vehicle_rate_cards (base_location_id, category_id)
  where model_id is null and vendor_id is null;
create unique index vehicle_rates_model_default_uidx
  on public.vehicle_rate_cards (base_location_id, category_id, model_id)
  where model_id is not null and vendor_id is null;
create unique index vehicle_rates_vendor_category_uidx
  on public.vehicle_rate_cards (base_location_id, category_id, vendor_id)
  where model_id is null and vendor_id is not null;
create unique index vehicle_rates_vendor_model_uidx
  on public.vehicle_rate_cards (base_location_id, category_id, model_id, vendor_id)
  where model_id is not null and vendor_id is not null;
create index vehicle_rates_resolution_idx
  on public.vehicle_rate_cards (base_location_id, category_id, model_id, vendor_id, status);

create or replace function public.set_vehicle_updated_at()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_vehicle_rate_audit_fields()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.updated_at = now();
    new.created_by = coalesce(auth.uid(), new.created_by);
    new.updated_by = coalesce(auth.uid(), new.updated_by);
  else
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
    new.updated_by = coalesce(auth.uid(), old.updated_by);
  end if;
  return new;
end;
$$;

create or replace function public.enforce_vehicle_rate_scope()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  linked_category uuid;
  linked_location uuid;
begin
  if new.model_id is not null then
    select category_id into linked_category from public.vehicle_models where id = new.model_id;
    if linked_category is null or linked_category <> new.category_id then
      raise exception 'The selected model does not belong to this vehicle category.';
    end if;
  end if;
  if new.vendor_id is not null then
    select base_location_id into linked_location from public.transport_vendors where id = new.vendor_id;
    if linked_location is null or linked_location <> new.base_location_id then
      raise exception 'The selected vendor does not belong to this base location.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_fleet_vehicle_capacity()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  model_seats smallint;
  model_comfort smallint;
  effective_seats smallint;
  effective_comfort smallint;
begin
  select seating_capacity, comfort_capacity
  into model_seats, model_comfort
  from public.vehicle_models
  where id = new.model_id;

  if model_seats is null then
    raise exception 'The selected vehicle model is unavailable.';
  end if;

  effective_seats := coalesce(new.seating_capacity, model_seats);
  effective_comfort := coalesce(new.comfort_capacity, model_comfort);
  if effective_comfort > effective_seats then
    raise exception 'Comfort capacity cannot exceed the effective seating capacity.';
  end if;
  return new;
end;
$$;

revoke all on function public.set_vehicle_updated_at() from public, anon, authenticated;
revoke all on function public.set_vehicle_rate_audit_fields() from public, anon, authenticated;
revoke all on function public.enforce_vehicle_rate_scope() from public, anon, authenticated;
revoke all on function public.enforce_fleet_vehicle_capacity() from public, anon, authenticated;

create trigger vehicle_categories_updated before update on public.vehicle_categories
for each row execute function public.set_vehicle_updated_at();
create trigger vehicle_models_updated before update on public.vehicle_models
for each row execute function public.set_vehicle_updated_at();
create trigger transport_vendors_updated before update on public.transport_vendors
for each row execute function public.set_vehicle_updated_at();
create trigger drivers_updated before update on public.drivers
for each row execute function public.set_vehicle_updated_at();
create trigger fleet_vehicles_updated before update on public.fleet_vehicles
for each row execute function public.set_vehicle_updated_at();
create trigger vehicle_rates_audit_fields before insert or update on public.vehicle_rate_cards
for each row execute function public.set_vehicle_rate_audit_fields();
create trigger vehicle_rates_enforce_scope before insert or update on public.vehicle_rate_cards
for each row execute function public.enforce_vehicle_rate_scope();
create trigger fleet_vehicles_enforce_capacity before insert or update on public.fleet_vehicles
for each row execute function public.enforce_fleet_vehicle_capacity();

alter table public.vehicle_categories enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.transport_vendors enable row level security;
alter table public.drivers enable row level security;
alter table public.fleet_vehicles enable row level security;
alter table public.vehicle_rate_cards enable row level security;

create policy locations_select_vehicle_dependency on public.locations for select to authenticated using (
  public.has_permission('vehicles.view') or public.has_permission('vehicles.create')
  or public.has_permission('vehicles.update') or public.has_permission('vehicles.manage_pricing')
  or public.has_permission('vehicles.assign')
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'vehicle_categories','vehicle_models','transport_vendors','drivers','fleet_vehicles'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        public.has_permission(''vehicles.view'') or public.has_permission(''vehicles.create'')
        or public.has_permission(''vehicles.update'') or public.has_permission(''vehicles.delete'')
        or public.has_permission(''vehicles.manage_pricing'') or public.has_permission(''vehicles.assign'')
      )', table_name || '_select_rbac', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        public.has_permission(''vehicles.create'')
      )', table_name || '_insert_rbac', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        public.has_permission(''vehicles.update'')
      ) with check (public.has_permission(''vehicles.update''))',
      table_name || '_update_rbac', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (
        public.has_permission(''vehicles.delete'')
      )', table_name || '_delete_rbac', table_name
    );
  end loop;
end;
$$;

create policy vehicle_rates_select_rbac on public.vehicle_rate_cards for select to authenticated using (
  public.has_permission('vehicles.view') or public.has_permission('vehicles.manage_pricing')
  or public.has_permission('vehicles.update') or public.has_permission('vehicles.assign')
);
create policy vehicle_rates_insert_rbac on public.vehicle_rate_cards for insert to authenticated with check (
  public.has_permission('vehicles.manage_pricing') and created_by = (select auth.uid())
);
create policy vehicle_rates_update_rbac on public.vehicle_rate_cards for update to authenticated using (
  public.has_permission('vehicles.manage_pricing')
) with check (public.has_permission('vehicles.manage_pricing'));
create policy vehicle_rates_delete_rbac on public.vehicle_rate_cards for delete to authenticated using (
  public.has_permission('vehicles.manage_pricing')
);

grant select, insert, update, delete on
  public.vehicle_categories, public.vehicle_models, public.transport_vendors,
  public.drivers, public.fleet_vehicles, public.vehicle_rate_cards
to authenticated;
revoke all on
  public.vehicle_categories, public.vehicle_models, public.transport_vendors,
  public.drivers, public.fleet_vehicles, public.vehicle_rate_cards
from anon;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'vehicle_categories','vehicle_models','transport_vendors','drivers','fleet_vehicles','vehicle_rate_cards'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.capture_row_audit()',
      table_name || '_audit', table_name
    );
  end loop;
end;
$$;

commit;
