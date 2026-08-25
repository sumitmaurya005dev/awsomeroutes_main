begin;

insert into public.permissions (module, action, permission_key, description)
values
  ('activities', 'view', 'activities.view', 'View activities and their pricing'),
  ('activities', 'create', 'activities.create', 'Create activities and offerings'),
  ('activities', 'update', 'activities.update', 'Update activities and offerings'),
  ('activities', 'delete', 'activities.delete', 'Delete unused activities'),
  ('activities', 'manage_pricing', 'activities.manage_pricing', 'Manage activity prices and additional charges'),
  ('activities', 'override_price', 'activities.override_price', 'Override calculated activity prices in packages and quotations')
on conflict (permission_key) do update
set module = excluded.module,
    action = excluded.action,
    description = excluded.description;

create table public.activity_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_categories_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index activity_categories_name_unique_idx on public.activity_categories (lower(name));
create unique index activity_categories_slug_unique_idx on public.activity_categories (lower(slug));
create index activity_categories_status_order_idx on public.activity_categories (status, display_order, name);

insert into public.activity_categories (name, slug, display_order)
values
  ('Wildlife Safari', 'wildlife-safari', 10),
  ('Adventure', 'adventure', 20),
  ('Water Sports', 'water-sports', 30),
  ('Winter Sports', 'winter-sports', 40),
  ('Trekking', 'trekking', 50),
  ('Cultural', 'cultural', 60),
  ('Other', 'other', 999)
on conflict do nothing;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  category_id uuid not null references public.activity_categories(id) on delete restrict,
  short_description text,
  description text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  difficulty_level text check (difficulty_level is null or difficulty_level in ('easy', 'moderate', 'challenging', 'extreme')),
  minimum_age smallint check (minimum_age is null or minimum_age >= 0),
  maximum_age smallint check (maximum_age is null or maximum_age >= 0),
  minimum_weight_kg numeric(6,2) check (minimum_weight_kg is null or minimum_weight_kg >= 0),
  maximum_weight_kg numeric(6,2) check (maximum_weight_kg is null or maximum_weight_kg >= 0),
  safety_information text,
  medical_restrictions text,
  what_to_carry text,
  inclusions text,
  exclusions text,
  highlights text,
  featured_image_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'temporarily_unavailable', 'inactive')),
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_age_range_check check (maximum_age is null or minimum_age is null or maximum_age >= minimum_age),
  constraint activities_weight_range_check check (maximum_weight_kg is null or minimum_weight_kg is null or maximum_weight_kg >= minimum_weight_kg),
  constraint activities_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index activities_slug_unique_idx on public.activities (lower(slug));
create index activities_status_created_idx on public.activities (status, created_at desc);
create index activities_category_status_idx on public.activities (category_id, status);
create index activities_featured_active_idx on public.activities (is_featured, created_at desc) where status = 'active' and is_featured;
create index activities_featured_image_idx on public.activities (featured_image_asset_id) where featured_image_asset_id is not null;

create table public.activity_media (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  display_order integer not null default 0 check (display_order >= 0),
  alt_text text,
  caption text,
  created_at timestamptz not null default now(),
  unique (activity_id, media_asset_id)
);

create index activity_media_activity_order_idx on public.activity_media (activity_id, display_order, created_at);
create index activity_media_asset_idx on public.activity_media (media_asset_id);

create table public.activity_offerings (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  pricing_model text not null check (pricing_model in ('per_unit', 'per_person', 'per_group', 'per_session')),
  base_price_paise bigint not null default 0 check (base_price_paise >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  minimum_participants integer not null default 1 check (minimum_participants > 0),
  maximum_participants_per_unit integer check (maximum_participants_per_unit is null or maximum_participants_per_unit > 0),
  maximum_units_per_booking integer check (maximum_units_per_booking is null or maximum_units_per_booking > 0),
  maximum_participants_per_booking integer check (maximum_participants_per_booking is null or maximum_participants_per_booking > 0),
  minimum_billable_participants integer not null default 1 check (minimum_billable_participants > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  tax_included boolean not null default true,
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  meeting_point text,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  reporting_instructions text,
  advance_booking_hours integer not null default 0 check (advance_booking_hours >= 0),
  status text not null default 'active' check (status in ('active', 'temporarily_unavailable', 'inactive')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, location_id),
  constraint activity_offerings_billable_minimum_check check (minimum_billable_participants >= minimum_participants),
  constraint activity_offerings_participant_limit_check check (maximum_participants_per_booking is null or maximum_participants_per_booking >= minimum_participants),
  constraint activity_offerings_capacity_check check (
    pricing_model <> 'per_unit' or maximum_participants_per_unit is not null
  )
);

create index activity_offerings_activity_status_idx on public.activity_offerings (activity_id, status);
create index activity_offerings_location_status_idx on public.activity_offerings (location_id, status);

create table public.activity_variants (
  id uuid primary key default gen_random_uuid(),
  activity_offering_id uuid not null references public.activity_offerings(id) on delete cascade,
  name text not null,
  description text,
  price_override_paise bigint check (price_override_paise is null or price_override_paise >= 0),
  capacity_override integer check (capacity_override is null or capacity_override > 0),
  duration_override_minutes integer check (duration_override_minutes is null or duration_override_minutes > 0),
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, activity_offering_id)
);

create unique index activity_variants_offering_name_unique_idx on public.activity_variants (activity_offering_id, lower(name));
create index activity_variants_offering_order_idx on public.activity_variants (activity_offering_id, status, display_order);

create table public.activity_participant_prices (
  id uuid primary key default gen_random_uuid(),
  activity_offering_id uuid not null references public.activity_offerings(id) on delete cascade,
  activity_variant_id uuid,
  participant_type text not null check (participant_type in ('infant', 'child', 'adult', 'senior', 'participant')),
  minimum_age smallint check (minimum_age is null or minimum_age >= 0),
  maximum_age smallint check (maximum_age is null or maximum_age >= 0),
  price_paise bigint not null check (price_paise >= 0),
  capacity_count numeric(4,2) not null default 1 check (capacity_count >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_participant_prices_age_check check (maximum_age is null or minimum_age is null or maximum_age >= minimum_age),
  constraint activity_participant_prices_variant_scope_fkey foreign key (activity_variant_id, activity_offering_id)
    references public.activity_variants(id, activity_offering_id) on delete cascade
);

create unique index activity_participant_prices_scope_unique_idx on public.activity_participant_prices (
  activity_offering_id, coalesce(activity_variant_id, '00000000-0000-0000-0000-000000000000'::uuid), participant_type
);
create index activity_participant_prices_offering_idx on public.activity_participant_prices (activity_offering_id, status);
create index activity_participant_prices_variant_idx on public.activity_participant_prices (activity_variant_id) where activity_variant_id is not null;

create table public.activity_charges (
  id uuid primary key default gen_random_uuid(),
  activity_offering_id uuid not null references public.activity_offerings(id) on delete cascade,
  activity_variant_id uuid,
  name text not null,
  calculation_type text not null check (calculation_type in ('per_person', 'per_adult', 'per_child', 'per_unit', 'per_booking', 'fixed')),
  amount_paise bigint not null check (amount_paise >= 0),
  mandatory boolean not null default true,
  taxable boolean not null default false,
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_charges_variant_scope_fkey foreign key (activity_variant_id, activity_offering_id)
    references public.activity_variants(id, activity_offering_id) on delete cascade
);

create index activity_charges_offering_order_idx on public.activity_charges (activity_offering_id, status, display_order);
create index activity_charges_variant_idx on public.activity_charges (activity_variant_id) where activity_variant_id is not null;

create table public.activity_slots (
  id uuid primary key default gen_random_uuid(),
  activity_offering_id uuid not null references public.activity_offerings(id) on delete cascade,
  activity_variant_id uuid,
  name text not null,
  start_time time not null,
  end_time time not null,
  price_override_paise bigint check (price_override_paise is null or price_override_paise >= 0),
  capacity_override integer check (capacity_override is null or capacity_override > 0),
  reporting_minutes_before integer not null default 0 check (reporting_minutes_before >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_offering_id, name, start_time),
  constraint activity_slots_variant_scope_fkey foreign key (activity_variant_id, activity_offering_id)
    references public.activity_variants(id, activity_offering_id) on delete cascade
);

create index activity_slots_offering_time_idx on public.activity_slots (activity_offering_id, status, start_time);
create index activity_slots_variant_idx on public.activity_slots (activity_variant_id) where activity_variant_id is not null;

create table public.activity_faqs (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  question text not null,
  answer text not null,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activity_faqs_activity_order_idx on public.activity_faqs (activity_id, status, display_order);

create or replace function public.set_activity_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_activity_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
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

revoke all on function public.set_activity_updated_at() from public;
revoke all on function public.set_activity_audit_fields() from public;

create trigger activities_set_audit before insert or update on public.activities
for each row execute function public.set_activity_audit_fields();
create trigger activity_categories_set_updated before update on public.activity_categories
for each row execute function public.set_activity_updated_at();
create trigger activity_offerings_set_audit before insert or update on public.activity_offerings
for each row execute function public.set_activity_audit_fields();
create trigger activity_variants_set_updated before update on public.activity_variants
for each row execute function public.set_activity_updated_at();
create trigger activity_participant_prices_set_updated before update on public.activity_participant_prices
for each row execute function public.set_activity_updated_at();
create trigger activity_charges_set_updated before update on public.activity_charges
for each row execute function public.set_activity_updated_at();
create trigger activity_slots_set_updated before update on public.activity_slots
for each row execute function public.set_activity_updated_at();
create trigger activity_faqs_set_updated before update on public.activity_faqs
for each row execute function public.set_activity_updated_at();

alter table public.activities enable row level security;
alter table public.activity_categories enable row level security;
alter table public.activity_media enable row level security;
alter table public.activity_offerings enable row level security;
alter table public.activity_variants enable row level security;
alter table public.activity_participant_prices enable row level security;
alter table public.activity_charges enable row level security;
alter table public.activity_slots enable row level security;
alter table public.activity_faqs enable row level security;

-- Activity editors need read-only access to the geographical hierarchy used
-- by the offering selector; these policies do not grant mutation access.
create policy countries_select_activity_dependency on public.countries for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy regions_select_activity_dependency on public.regions for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy destinations_select_activity_dependency on public.destinations for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy locations_select_activity_dependency on public.locations for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);

create policy activity_categories_select_rbac on public.activity_categories for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy activity_categories_insert_rbac on public.activity_categories for insert to authenticated with check (
  public.has_permission('activities.create')
);
create policy activity_categories_update_rbac on public.activity_categories for update to authenticated using (
  public.has_permission('activities.update')
) with check (public.has_permission('activities.update'));
create policy activity_categories_delete_rbac on public.activity_categories for delete to authenticated using (
  public.has_permission('activities.delete')
);

create policy activities_select_rbac on public.activities for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy activities_insert_rbac on public.activities for insert to authenticated with check (
  public.has_permission('activities.create') and created_by = auth.uid()
);
create policy activities_update_rbac on public.activities for update to authenticated using (
  public.has_permission('activities.update')
) with check (public.has_permission('activities.update'));
create policy activities_delete_rbac on public.activities for delete to authenticated using (
  public.has_permission('activities.delete')
);

create policy activity_media_select_rbac on public.activity_media for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy activity_media_insert_rbac on public.activity_media for insert to authenticated with check (
  public.has_permission('activities.create') or public.has_permission('activities.update')
);
create policy activity_media_update_rbac on public.activity_media for update to authenticated using (
  public.has_permission('activities.update')
) with check (public.has_permission('activities.update'));
create policy activity_media_delete_rbac on public.activity_media for delete to authenticated using (
  public.has_permission('activities.update') or public.has_permission('activities.delete')
);

create policy activity_offerings_select_rbac on public.activity_offerings for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy activity_offerings_insert_rbac on public.activity_offerings for insert to authenticated with check (
  (public.has_permission('activities.create') or public.has_permission('activities.manage_pricing')) and created_by = auth.uid()
);
create policy activity_offerings_update_rbac on public.activity_offerings for update to authenticated using (
  public.has_permission('activities.manage_pricing')
) with check (public.has_permission('activities.manage_pricing'));
create policy activity_offerings_delete_rbac on public.activity_offerings for delete to authenticated using (
  public.has_permission('activities.manage_pricing') or public.has_permission('activities.delete')
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['activity_variants', 'activity_participant_prices', 'activity_charges', 'activity_slots']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''activities.view'') or public.has_permission(''activities.create'') or public.has_permission(''activities.update'') or public.has_permission(''activities.manage_pricing''))', table_name || '_select_rbac', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''activities.manage_pricing'') or public.has_permission(''activities.create''))', table_name || '_insert_rbac', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''activities.manage_pricing'')) with check (public.has_permission(''activities.manage_pricing''))', table_name || '_update_rbac', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_permission(''activities.manage_pricing'') or public.has_permission(''activities.delete''))', table_name || '_delete_rbac', table_name);
  end loop;
end
$$;

create policy activity_faqs_select_rbac on public.activity_faqs for select to authenticated using (
  public.has_permission('activities.view') or public.has_permission('activities.create') or public.has_permission('activities.update') or public.has_permission('activities.manage_pricing')
);
create policy activity_faqs_insert_rbac on public.activity_faqs for insert to authenticated with check (
  public.has_permission('activities.create') or public.has_permission('activities.update')
);
create policy activity_faqs_update_rbac on public.activity_faqs for update to authenticated using (
  public.has_permission('activities.update')
) with check (public.has_permission('activities.update'));
create policy activity_faqs_delete_rbac on public.activity_faqs for delete to authenticated using (
  public.has_permission('activities.update') or public.has_permission('activities.delete')
);

create policy activities_public_read on public.activities for select to anon, authenticated using (status = 'active');
create policy activity_categories_public_read on public.activity_categories for select to anon, authenticated using (status = 'active');
create policy activity_media_public_read on public.activity_media for select to anon, authenticated using (
  exists (select 1 from public.activities activity where activity.id = activity_media.activity_id and activity.status = 'active')
);
create policy activity_offerings_public_read on public.activity_offerings for select to anon, authenticated using (
  status = 'active' and exists (select 1 from public.activities activity where activity.id = activity_offerings.activity_id and activity.status = 'active')
);
create policy activity_variants_public_read on public.activity_variants for select to anon, authenticated using (
  status = 'active' and exists (
    select 1 from public.activity_offerings offering
    join public.activities activity on activity.id = offering.activity_id
    where offering.id = activity_variants.activity_offering_id and offering.status = 'active' and activity.status = 'active'
  )
);
create policy activity_participant_prices_public_read on public.activity_participant_prices for select to anon, authenticated using (
  status = 'active' and exists (
    select 1 from public.activity_offerings offering
    join public.activities activity on activity.id = offering.activity_id
    where offering.id = activity_participant_prices.activity_offering_id and offering.status = 'active' and activity.status = 'active'
  )
);
create policy activity_charges_public_read on public.activity_charges for select to anon, authenticated using (
  status = 'active' and exists (
    select 1 from public.activity_offerings offering
    join public.activities activity on activity.id = offering.activity_id
    where offering.id = activity_charges.activity_offering_id and offering.status = 'active' and activity.status = 'active'
  )
);
create policy activity_slots_public_read on public.activity_slots for select to anon, authenticated using (
  status = 'active' and exists (
    select 1 from public.activity_offerings offering
    join public.activities activity on activity.id = offering.activity_id
    where offering.id = activity_slots.activity_offering_id and offering.status = 'active' and activity.status = 'active'
  )
);
create policy activity_faqs_public_read on public.activity_faqs for select to anon, authenticated using (
  status = 'active' and exists (select 1 from public.activities activity where activity.id = activity_faqs.activity_id and activity.status = 'active')
);
create policy media_assets_public_read on public.media_assets for select to anon, authenticated using (
  status = 'active' and is_public and media_type = 'image'
);
create policy countries_public_read on public.countries for select to anon, authenticated using (status = 'active');
create policy regions_public_read on public.regions for select to anon, authenticated using (status = 'active');
create policy destinations_public_read on public.destinations for select to anon, authenticated using (status = 'active');
create policy locations_public_read on public.locations for select to anon, authenticated using (status = 'active');

grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.activity_categories to authenticated;
grant select, insert, update, delete on public.activity_media to authenticated;
grant select, insert, update, delete on public.activity_offerings to authenticated;
grant select, insert, update, delete on public.activity_variants to authenticated;
grant select, insert, update, delete on public.activity_participant_prices to authenticated;
grant select, insert, update, delete on public.activity_charges to authenticated;
grant select, insert, update, delete on public.activity_slots to authenticated;
grant select, insert, update, delete on public.activity_faqs to authenticated;
grant select on public.activities, public.activity_categories, public.activity_media, public.activity_offerings,
  public.activity_variants, public.activity_participant_prices, public.activity_charges,
  public.activity_slots, public.activity_faqs, public.media_assets,
  public.countries, public.regions, public.destinations, public.locations to anon;

commit;
