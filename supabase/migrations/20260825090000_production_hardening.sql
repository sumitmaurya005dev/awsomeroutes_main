begin;

-- ---------------------------------------------------------------------------
-- Portal identity lifecycle
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where auth_user.id = profile.id
  and profile.email is distinct from auth_user.email;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email)) where email is not null;
create index if not exists profiles_role_status_idx
  on public.profiles (role_id, status);

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.profiles
  set email = new.email,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public, anon, authenticated;

drop trigger if exists auth_user_email_sync on auth.users;
create trigger auth_user_email_sync
after update of email on auth.users
for each row execute function public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_created_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc) where actor_id is not null;
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
for select to authenticated
using (public.has_permission('settings.manage'));

revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;

create or replace function public.capture_row_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_row jsonb;
  new_row jsonb;
  record_id text;
begin
  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_id := coalesce(new_row ->> 'id', old_row ->> 'id');

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    coalesce(
      auth.uid(),
      nullif(current_setting('app.actor_id', true), '')::uuid
    ),
    lower(tg_op),
    tg_table_name,
    record_id,
    old_row,
    new_row
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_row_audit() from public, anon, authenticated;

do $$
declare
  audited_table text;
begin
  foreach audited_table in array array[
    'profiles', 'roles', 'permissions', 'role_permissions',
    'countries', 'regions', 'destinations', 'locations', 'media_assets',
    'activities', 'activity_offerings', 'activity_variants',
    'activity_participant_prices', 'activity_charges', 'activity_slots'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', audited_table || '_audit', audited_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_row_audit()',
      audited_table || '_audit',
      audited_table
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Login throttling. Only the service-role server client can call these RPCs.
-- Raw email addresses and IP addresses are never stored; the application sends
-- a SHA-256 fingerprint.
-- ---------------------------------------------------------------------------

create table if not exists public.login_rate_limits (
  fingerprint text primary key,
  failure_count integer not null default 0 check (failure_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_rate_limits enable row level security;
revoke all on table public.login_rate_limits from public, anon, authenticated;

create or replace function public.get_login_block_seconds(p_fingerprint text)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    coalesce(ceil(extract(epoch from (blocked_until - now())))::integer, 0)
  )
  from public.login_rate_limits
  where fingerprint = p_fingerprint
$$;

create or replace function public.record_login_attempt(
  p_fingerprint text,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rate_row public.login_rate_limits%rowtype;
  next_count integer;
begin
  if p_succeeded then
    delete from public.login_rate_limits where fingerprint = p_fingerprint;
    return;
  end if;

  insert into public.login_rate_limits (fingerprint)
  values (p_fingerprint)
  on conflict (fingerprint) do nothing;

  select * into rate_row
  from public.login_rate_limits
  where fingerprint = p_fingerprint
  for update;

  if rate_row.window_started_at < now() - interval '15 minutes' then
    next_count := 1;
    update public.login_rate_limits
    set failure_count = next_count,
        window_started_at = now(),
        blocked_until = null,
        updated_at = now()
    where fingerprint = p_fingerprint;
  else
    next_count := rate_row.failure_count + 1;
    update public.login_rate_limits
    set failure_count = next_count,
        blocked_until = case when next_count >= 5 then now() + interval '15 minutes' else blocked_until end,
        updated_at = now()
    where fingerprint = p_fingerprint;
  end if;
end;
$$;

revoke all on function public.get_login_block_seconds(text) from public, anon, authenticated;
revoke all on function public.record_login_attempt(text, boolean) from public, anon, authenticated;
grant execute on function public.get_login_block_seconds(text) to service_role;
grant execute on function public.record_login_attempt(text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Atomic role and permission replacement
-- ---------------------------------------------------------------------------

create or replace function public.save_role_with_permissions(
  p_role_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_permission_ids uuid[],
  p_actor_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
  existing_slug text;
  effective_permission_ids uuid[];
begin
  perform set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
  if p_role_id is null then
    insert into public.roles (name, slug, description)
    values (p_name, p_slug, p_description)
    returning id into saved_id;
  else
    select slug into existing_slug from public.roles where id = p_role_id for update;
    if existing_slug is null then
      raise exception 'Role was not found.';
    end if;
    if existing_slug = 'super_admin' and p_slug <> 'super_admin' then
      raise exception 'The Super Admin role slug cannot be changed.';
    end if;

    update public.roles
    set name = p_name,
        slug = p_slug,
        description = p_description
    where id = p_role_id
    returning id into saved_id;
  end if;

  if p_slug = 'super_admin' then
    select coalesce(array_agg(id), '{}'::uuid[])
    into effective_permission_ids
    from public.permissions;
  else
    effective_permission_ids := coalesce(p_permission_ids, '{}'::uuid[]);
  end if;

  delete from public.role_permissions where role_id = saved_id;
  insert into public.role_permissions (role_id, permission_id)
  select saved_id, permission_id
  from unnest(effective_permission_ids) permission_id
  on conflict (role_id, permission_id) do nothing;

  return saved_id;
end;
$$;

revoke all on function public.save_role_with_permissions(uuid, text, text, text, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.save_role_with_permissions(uuid, text, text, text, uuid[], uuid) to service_role;

create or replace function public.save_permission_definition(
  p_permission_id uuid,
  p_module text,
  p_action text,
  p_permission_key text,
  p_description text,
  p_actor_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
  existing public.permissions%rowtype;
begin
  perform set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
  if p_permission_id is null then
    insert into public.permissions (module, action, permission_key, description)
    values (p_module, p_action, p_permission_key, p_description)
    returning id into saved_id;
  else
    select * into existing from public.permissions where id = p_permission_id for update;
    if existing.id is null then raise exception 'Permission was not found.'; end if;
    if existing.module <> p_module or existing.action <> p_action or existing.permission_key <> p_permission_key then
      raise exception 'Permission module, action, and key are immutable. Create a new permission instead.';
    end if;
    update public.permissions set description = p_description where id = p_permission_id returning id into saved_id;
  end if;
  return saved_id;
end;
$$;

revoke all on function public.save_permission_definition(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.save_permission_definition(uuid, text, text, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Atomic Activity master and gallery save
-- ---------------------------------------------------------------------------

create or replace function public.save_activity_with_gallery(
  p_activity_id uuid,
  p_activity jsonb,
  p_gallery_asset_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
  featured_asset_id uuid;
  gallery_ids uuid[] := coalesce(p_gallery_asset_ids, '{}'::uuid[]);
  expected_assets integer;
  valid_assets integer;
begin
  if coalesce(array_length(gallery_ids, 1), 0) > 30 then
    raise exception 'An activity gallery supports a maximum of 30 images.';
  end if;

  featured_asset_id := nullif(p_activity ->> 'featured_image_asset_id', '')::uuid;
  select count(distinct asset_id) into expected_assets
  from unnest(gallery_ids || case when featured_asset_id is null then '{}'::uuid[] else array[featured_asset_id] end) asset_id;

  select count(*) into valid_assets
  from public.media_assets media
  where media.id = any(gallery_ids || case when featured_asset_id is null then '{}'::uuid[] else array[featured_asset_id] end)
    and media.status = 'active'
    and media.media_type = 'image';

  if valid_assets <> expected_assets then
    raise exception 'One or more selected images are unavailable.';
  end if;

  if p_activity_id is null then
    insert into public.activities (
      name, slug, category_id, short_description, description,
      duration_minutes, difficulty_level, minimum_age, maximum_age,
      minimum_weight_kg, maximum_weight_kg, safety_information,
      medical_restrictions, what_to_carry, inclusions, exclusions,
      highlights, featured_image_asset_id, status, is_featured,
      seo_title, seo_description, created_by, updated_by
    ) values (
      p_activity ->> 'name',
      p_activity ->> 'slug',
      (p_activity ->> 'category_id')::uuid,
      p_activity ->> 'short_description',
      p_activity ->> 'description',
      (p_activity ->> 'duration_minutes')::integer,
      p_activity ->> 'difficulty_level',
      (p_activity ->> 'minimum_age')::smallint,
      (p_activity ->> 'maximum_age')::smallint,
      (p_activity ->> 'minimum_weight_kg')::numeric,
      (p_activity ->> 'maximum_weight_kg')::numeric,
      p_activity ->> 'safety_information',
      p_activity ->> 'medical_restrictions',
      p_activity ->> 'what_to_carry',
      p_activity ->> 'inclusions',
      p_activity ->> 'exclusions',
      p_activity ->> 'highlights',
      featured_asset_id,
      p_activity ->> 'status',
      coalesce((p_activity ->> 'is_featured')::boolean, false),
      p_activity ->> 'seo_title',
      p_activity ->> 'seo_description',
      auth.uid(),
      auth.uid()
    ) returning id into saved_id;
  else
    update public.activities
    set name = p_activity ->> 'name',
        slug = p_activity ->> 'slug',
        category_id = (p_activity ->> 'category_id')::uuid,
        short_description = p_activity ->> 'short_description',
        description = p_activity ->> 'description',
        duration_minutes = (p_activity ->> 'duration_minutes')::integer,
        difficulty_level = p_activity ->> 'difficulty_level',
        minimum_age = (p_activity ->> 'minimum_age')::smallint,
        maximum_age = (p_activity ->> 'maximum_age')::smallint,
        minimum_weight_kg = (p_activity ->> 'minimum_weight_kg')::numeric,
        maximum_weight_kg = (p_activity ->> 'maximum_weight_kg')::numeric,
        safety_information = p_activity ->> 'safety_information',
        medical_restrictions = p_activity ->> 'medical_restrictions',
        what_to_carry = p_activity ->> 'what_to_carry',
        inclusions = p_activity ->> 'inclusions',
        exclusions = p_activity ->> 'exclusions',
        highlights = p_activity ->> 'highlights',
        featured_image_asset_id = featured_asset_id,
        status = p_activity ->> 'status',
        is_featured = coalesce((p_activity ->> 'is_featured')::boolean, false),
        seo_title = p_activity ->> 'seo_title',
        seo_description = p_activity ->> 'seo_description',
        updated_by = auth.uid()
    where id = p_activity_id
    returning id into saved_id;

    if saved_id is null then
      raise exception 'Activity was not found or cannot be updated.';
    end if;
  end if;

  delete from public.activity_media where activity_id = saved_id;
  insert into public.activity_media (activity_id, media_asset_id, display_order)
  select saved_id, deduplicated.asset_id, deduplicated.ordinal - 1
  from (
    select distinct on (item.asset_id) item.asset_id, item.ordinal
    from unnest(gallery_ids) with ordinality item(asset_id, ordinal)
    order by item.asset_id, item.ordinal
  ) deduplicated
  order by deduplicated.ordinal;

  return saved_id;
end;
$$;

revoke all on function public.save_activity_with_gallery(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_activity_with_gallery(uuid, jsonb, uuid[]) to authenticated;

-- Variant/slot overrides are approval-sensitive and receive database-level
-- enforcement in addition to server-side checks.
create or replace function public.enforce_activity_price_override_permission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Service-role maintenance bypasses end-user permission checks.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.price_override_paise is not null
       and not public.has_permission('activities.override_price') then
      raise exception 'Missing required permission: activities.override_price';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.price_override_paise is distinct from old.price_override_paise
       and not public.has_permission('activities.override_price') then
      raise exception 'Missing required permission: activities.override_price';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_activity_price_override_permission() from public, anon, authenticated;

drop trigger if exists activity_variants_enforce_override_permission on public.activity_variants;
create trigger activity_variants_enforce_override_permission
before insert or update of price_override_paise on public.activity_variants
for each row execute function public.enforce_activity_price_override_permission();

drop trigger if exists activity_slots_enforce_override_permission on public.activity_slots;
create trigger activity_slots_enforce_override_permission
before insert or update of price_override_paise on public.activity_slots
for each row execute function public.enforce_activity_price_override_permission();

-- ---------------------------------------------------------------------------
-- Strict public read surface
-- ---------------------------------------------------------------------------

drop policy if exists activities_public_read on public.activities;
create policy activities_public_read on public.activities for select to anon
using (status = 'active');

drop policy if exists activity_categories_public_read on public.activity_categories;
create policy activity_categories_public_read on public.activity_categories for select to anon
using (status = 'active');

drop policy if exists activity_media_public_read on public.activity_media;
create policy activity_media_public_read on public.activity_media for select to anon
using (exists (
  select 1 from public.activities activity
  where activity.id = activity_media.activity_id and activity.status = 'active'
));

drop policy if exists activity_offerings_public_read on public.activity_offerings;
create policy activity_offerings_public_read on public.activity_offerings for select to anon
using (
  status = 'active'
  and exists (
    select 1
    from public.activities activity
    join public.locations location on location.id = activity_offerings.location_id and location.status = 'active'
    join public.destinations destination on destination.id = location.destination_id and destination.status = 'active'
    join public.regions region on region.id = destination.region_id and region.status = 'active'
    join public.countries country on country.id = region.country_id and country.status = 'active'
    where activity.id = activity_offerings.activity_id and activity.status = 'active'
  )
);

do $$
declare
  child_table text;
begin
  foreach child_table in array array[
    'activity_variants', 'activity_participant_prices', 'activity_charges', 'activity_slots'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', child_table || '_public_read', child_table);
    execute format(
      'create policy %I on public.%I for select to anon using (status = ''active'' and exists (select 1 from public.activity_offerings offering join public.activities activity on activity.id = offering.activity_id where offering.id = %I.activity_offering_id and offering.status = ''active'' and activity.status = ''active''))',
      child_table || '_public_read',
      child_table,
      child_table
    );
  end loop;
end
$$;

drop policy if exists activity_faqs_public_read on public.activity_faqs;
create policy activity_faqs_public_read on public.activity_faqs for select to anon
using (status = 'active' and exists (
  select 1 from public.activities activity
  where activity.id = activity_faqs.activity_id and activity.status = 'active'
));

drop policy if exists media_assets_public_read on public.media_assets;
create policy media_assets_public_read on public.media_assets for select to anon
using (status = 'active' and is_public and media_type = 'image' and folder <> '/awesomeroutes/profiles');

drop policy if exists countries_public_read on public.countries;
create policy countries_public_read on public.countries for select to anon
using (status = 'active');

drop policy if exists regions_public_read on public.regions;
create policy regions_public_read on public.regions for select to anon
using (status = 'active' and exists (
  select 1 from public.countries country
  where country.id = regions.country_id and country.status = 'active'
));

drop policy if exists destinations_public_read on public.destinations;
create policy destinations_public_read on public.destinations for select to anon
using (status = 'active' and exists (
  select 1
  from public.regions region
  join public.countries country on country.id = region.country_id
  where region.id = destinations.region_id
    and region.status = 'active'
    and country.status = 'active'
));

drop policy if exists locations_public_read on public.locations;
create policy locations_public_read on public.locations for select to anon
using (status = 'active' and exists (
  select 1
  from public.destinations destination
  join public.regions region on region.id = destination.region_id
  join public.countries country on country.id = region.country_id
  where destination.id = locations.destination_id
    and destination.status = 'active'
    and region.status = 'active'
    and country.status = 'active'
));

revoke select on table public.activities, public.activity_categories,
  public.activity_media, public.activity_offerings, public.activity_variants,
  public.activity_participant_prices, public.activity_charges,
  public.activity_slots, public.activity_faqs, public.media_assets,
  public.countries, public.regions, public.destinations, public.locations from anon;

grant select (id, name, slug, category_id, short_description, description,
  duration_minutes, difficulty_level, minimum_age, maximum_age,
  minimum_weight_kg, maximum_weight_kg, safety_information,
  medical_restrictions, what_to_carry, inclusions, exclusions, highlights,
  featured_image_asset_id, status, is_featured, seo_title, seo_description)
  on public.activities to anon;
grant select (id, name, slug, description, display_order, status)
  on public.activity_categories to anon;
grant select (id, activity_id, media_asset_id, display_order, alt_text)
  on public.activity_media to anon;
grant select (id, activity_id, location_id, pricing_model, base_price_paise,
  currency, minimum_participants, maximum_participants_per_unit,
  maximum_units_per_booking, maximum_participants_per_booking,
  minimum_billable_participants, duration_minutes, tax_included, tax_rate_bps,
  meeting_point, latitude, longitude, reporting_instructions,
  advance_booking_hours, status)
  on public.activity_offerings to anon;
grant select (id, activity_offering_id, name, description,
  price_override_paise, capacity_override, duration_override_minutes,
  display_order, status)
  on public.activity_variants to anon;
grant select (id, activity_offering_id, activity_variant_id,
  participant_type, minimum_age, maximum_age, price_paise,
  capacity_count, status)
  on public.activity_participant_prices to anon;
grant select (id, activity_offering_id, activity_variant_id, name,
  calculation_type, amount_paise, mandatory, taxable, description,
  display_order, status)
  on public.activity_charges to anon;
grant select (id, activity_offering_id, activity_variant_id, name,
  start_time, end_time, price_override_paise, capacity_override,
  reporting_minutes_before, status)
  on public.activity_slots to anon;
grant select (id, activity_id, question, answer, display_order, status)
  on public.activity_faqs to anon;
grant select (id, original_url, file_name, mime_type, width, height, alt_text)
  on public.media_assets to anon;
grant select (id, name, slug, iso_code, phone_code, description,
  image_url, image_asset_id, status)
  on public.countries to anon;
grant select (id, country_id, name, slug, description, image_url,
  image_asset_id, status)
  on public.regions to anon;
grant select (id, region_id, name, slug, short_description, description,
  image_url, image_asset_id, latitude, longitude, status)
  on public.destinations to anon;
grant select (id, destination_id, name, slug, location_type,
  short_description, description, address, latitude, longitude,
  image_url, image_asset_id, status)
  on public.locations to anon;

commit;
