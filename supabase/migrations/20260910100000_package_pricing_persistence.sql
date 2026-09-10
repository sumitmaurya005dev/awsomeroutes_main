begin;

alter table public.packages
  add column if not exists pricing_revision bigint not null default 1,
  add column if not exists calculated_pricing_revision bigint,
  add column if not exists pricing_status text not null default 'queued'
    check (pricing_status in ('queued','processing','ready','incomplete','failed')),
  add column if not exists pricing_calculated_at timestamptz;

create table if not exists public.package_price_matrix (
  package_id uuid not null references public.packages(id) on delete cascade,
  hotel_category_id uuid not null references public.hotel_categories(id) on delete restrict,
  pax smallint not null check (pax between 1 and 100),
  occupancy_code text not null default 'standard'
    check (occupancy_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  room_count smallint not null default 0 check (room_count between 0 and 50),
  extra_bed_count smallint not null default 0 check (extra_bed_count between 0 and 50),
  hotel_total_paise bigint not null check (hotel_total_paise >= 0),
  activity_total_paise bigint not null check (activity_total_paise >= 0),
  vehicle_total_paise bigint not null check (vehicle_total_paise >= 0),
  adjustment_total_paise bigint not null,
  group_total_paise bigint not null check (group_total_paise >= 0),
  per_person_paise bigint not null check (per_person_paise >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  is_complete boolean not null default true,
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  pricing_revision bigint not null,
  calculated_at timestamptz not null default now(),
  primary key (package_id, hotel_category_id, pax, occupancy_code)
);

create index if not exists package_price_matrix_public_idx
  on public.package_price_matrix(package_id, pricing_revision, pax, hotel_category_id)
  include (per_person_paise, group_total_paise, currency, is_complete);

create table if not exists public.package_pricing_refresh_queue (
  package_id uuid primary key references public.packages(id) on delete cascade,
  requested_revision bigint not null,
  requested_at timestamptz not null default now(),
  attempts smallint not null default 0 check (attempts between 0 and 100),
  processing_started_at timestamptz,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9_-]{1,40}$')
);

create index if not exists package_pricing_queue_order_idx
  on public.package_pricing_refresh_queue(requested_at, package_id);

create or replace function public.enqueue_package_pricing(p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare next_revision bigint;
begin
  if p_package_id is null then return; end if;

  update public.packages
  set pricing_revision = pricing_revision + 1,
      pricing_status = 'queued'
  where id = p_package_id
  returning pricing_revision into next_revision;

  if next_revision is null then return; end if;

  insert into public.package_pricing_refresh_queue(
    package_id, requested_revision, requested_at, attempts,
    processing_started_at, last_error_code
  ) values (p_package_id, next_revision, now(), 0, null, null)
  on conflict(package_id) do update
  set requested_revision = excluded.requested_revision,
      requested_at = excluded.requested_at,
      attempts = 0,
      processing_started_at = null,
      last_error_code = null;
end;
$$;

create or replace function public.queue_package_pricing_from_package_child()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare affected_package_id uuid;
begin
  affected_package_id := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  perform public.enqueue_package_pricing(affected_package_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.queue_package_pricing_from_package()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.enqueue_package_pricing(new.id);
  return new;
end;
$$;

create or replace function public.enforce_package_pricing_before_publish()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and (
       new.pricing_status <> 'ready'
       or new.calculated_pricing_revision is distinct from new.pricing_revision
       or not exists(
         select 1 from public.package_price_matrix m
         where m.package_id = new.id and m.pricing_revision = new.pricing_revision
           and m.is_complete
       )
     ) then
    raise exception 'Calculate complete package pricing before publishing.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.queue_package_pricing_from_day_child()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare affected_day_id uuid;
declare affected_package_id uuid;
begin
  affected_day_id := case when tg_op = 'DELETE' then old.itinerary_day_id else new.itinerary_day_id end;
  select package_id into affected_package_id
  from public.package_itinerary_days where id = affected_day_id;
  perform public.enqueue_package_pricing(affected_package_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.queue_package_pricing_from_hotel_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare location_ids uuid[];
declare package_row record;
begin
  location_ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.location_id else null end,
    case when tg_op <> 'DELETE' then new.location_id else null end
  ], null);
  for package_row in
    select distinct d.package_id
    from public.package_itinerary_days d
    where d.overnight_location_id = any(location_ids)
  loop perform public.enqueue_package_pricing(package_row.package_id); end loop;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.queue_package_pricing_from_activity_source()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare offering_ids uuid[];
declare package_row record;
begin
  if tg_table_name = 'activity_offerings' then
    offering_ids := array_remove(array[
      case when tg_op <> 'INSERT' then old.id else null end,
      case when tg_op <> 'DELETE' then new.id else null end
    ], null);
  else
    offering_ids := array_remove(array[
      case when tg_op <> 'INSERT' then old.activity_offering_id else null end,
      case when tg_op <> 'DELETE' then new.activity_offering_id else null end
    ], null);
  end if;
  for package_row in
    select distinct d.package_id
    from public.package_day_activities a
    join public.package_itinerary_days d on d.id = a.itinerary_day_id
    where a.activity_offering_id = any(offering_ids)
  loop perform public.enqueue_package_pricing(package_row.package_id); end loop;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.queue_package_pricing_from_vehicle_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare package_row record;
declare old_location uuid := case when tg_op <> 'INSERT' then old.base_location_id else null end;
declare old_category uuid := case when tg_op <> 'INSERT' then old.category_id else null end;
declare new_location uuid := case when tg_op <> 'DELETE' then new.base_location_id else null end;
declare new_category uuid := case when tg_op <> 'DELETE' then new.category_id else null end;
begin
  for package_row in
    select distinct v.package_id
    from public.package_vehicle_options v
    where (v.base_location_id = old_location and v.vehicle_category_id = old_category)
       or (v.base_location_id = new_location and v.vehicle_category_id = new_category)
  loop perform public.enqueue_package_pricing(package_row.package_id); end loop;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.replace_package_price_matrix(
  p_package_id uuid,
  p_rows jsonb,
  p_expected_revision bigint
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare current_revision bigint;
declare complete_matrix boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'You do not have permission to calculate package pricing.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'A non-empty pricing matrix is required.' using errcode = '22023';
  end if;

  select pricing_revision into current_revision
  from public.packages where id = p_package_id for update;
  if current_revision is null then
    raise exception 'Package was not found.' using errcode = 'P0002';
  end if;
  if current_revision is distinct from p_expected_revision then
    return 'stale';
  end if;

  drop table if exists pg_temp.package_matrix_input;
  create temporary table package_matrix_input on commit drop as
  select * from jsonb_to_recordset(p_rows) as row_data(
    hotel_category_id uuid,
    pax smallint,
    occupancy_code text,
    room_count smallint,
    extra_bed_count smallint,
    hotel_total_paise bigint,
    activity_total_paise bigint,
    vehicle_total_paise bigint,
    adjustment_total_paise bigint,
    group_total_paise bigint,
    per_person_paise bigint,
    currency text,
    is_complete boolean,
    warnings jsonb
  );

  if exists(
    select 1 from package_matrix_input r
    where r.hotel_category_id is null or r.pax is null
       or r.occupancy_code is null or r.room_count is null or r.extra_bed_count is null
       or r.hotel_total_paise is null or r.activity_total_paise is null
       or r.vehicle_total_paise is null or r.adjustment_total_paise is null
       or r.group_total_paise is null or r.per_person_paise is null
       or r.currency is null or r.is_complete is null or r.warnings is null
  ) then raise exception 'Pricing rows contain missing fields.' using errcode = '22023'; end if;

  delete from public.package_price_matrix where package_id = p_package_id;
  insert into public.package_price_matrix(
    package_id, hotel_category_id, pax, occupancy_code, room_count,
    extra_bed_count, hotel_total_paise, activity_total_paise,
    vehicle_total_paise, adjustment_total_paise, group_total_paise,
    per_person_paise, currency, is_complete, warnings, pricing_revision
  )
  select p_package_id, hotel_category_id, pax, occupancy_code, room_count,
    extra_bed_count, hotel_total_paise, activity_total_paise,
    vehicle_total_paise, adjustment_total_paise, group_total_paise,
    per_person_paise, currency, is_complete, warnings, current_revision
  from package_matrix_input;

  select bool_and(is_complete) into complete_matrix from package_matrix_input;
  update public.packages
  set calculated_pricing_revision = current_revision,
      pricing_status = case when complete_matrix then 'ready' else 'incomplete' end,
      pricing_calculated_at = now()
  where id = p_package_id;
  delete from public.package_pricing_refresh_queue
  where package_id = p_package_id and requested_revision <= current_revision;
  return case when complete_matrix then 'ready' else 'incomplete' end;
end;
$$;

create or replace function public.claim_package_pricing_refresh(p_limit integer default 25)
returns table(package_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the pricing worker can claim refresh jobs.' using errcode = '42501';
  end if;
  return query
  with candidates as (
    select q.package_id
    from public.package_pricing_refresh_queue q
    where q.processing_started_at is null
       or q.processing_started_at < now() - interval '5 minutes'
    order by q.requested_at, q.package_id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  )
  update public.package_pricing_refresh_queue q
  set processing_started_at = now(), attempts = least(q.attempts + 1, 100)
  from candidates c
  where q.package_id = c.package_id
  returning q.package_id;
end;
$$;

drop trigger if exists package_days_pricing_queue on public.package_itinerary_days;
create trigger package_days_pricing_queue
after insert or update of overnight_location_id or delete on public.package_itinerary_days
for each row execute function public.queue_package_pricing_from_package_child();

drop trigger if exists packages_pricing_queue on public.packages;
create trigger packages_pricing_queue
after insert or update of duration_days, duration_nights on public.packages
for each row execute function public.queue_package_pricing_from_package();

drop trigger if exists packages_pricing_publish_guard on public.packages;
create trigger packages_pricing_publish_guard
before insert or update of status on public.packages
for each row execute function public.enforce_package_pricing_before_publish();

drop trigger if exists package_vehicles_pricing_queue on public.package_vehicle_options;
create trigger package_vehicles_pricing_queue
after insert or update or delete on public.package_vehicle_options
for each row execute function public.queue_package_pricing_from_package_child();

drop trigger if exists package_adjustments_pricing_queue on public.package_price_adjustments;
create trigger package_adjustments_pricing_queue
after insert or update or delete on public.package_price_adjustments
for each row execute function public.queue_package_pricing_from_package_child();

drop trigger if exists package_activities_pricing_queue on public.package_day_activities;
create trigger package_activities_pricing_queue
after insert or update or delete on public.package_day_activities
for each row execute function public.queue_package_pricing_from_day_child();

drop trigger if exists package_hotels_pricing_queue on public.package_day_hotels;
create trigger package_hotels_pricing_queue
after insert or update or delete on public.package_day_hotels
for each row execute function public.queue_package_pricing_from_day_child();

drop trigger if exists hotel_rates_package_pricing_queue on public.hotel_rate_cards;
create trigger hotel_rates_package_pricing_queue
after insert or update or delete on public.hotel_rate_cards
for each row execute function public.queue_package_pricing_from_hotel_rate();

drop trigger if exists activity_offerings_package_pricing_queue on public.activity_offerings;
create trigger activity_offerings_package_pricing_queue
after update of base_price_paise, pricing_model, minimum_participants,
  maximum_participants_per_unit, maximum_units_per_booking,
  maximum_participants_per_booking, minimum_billable_participants,
  tax_included, tax_rate_bps, status on public.activity_offerings
for each row execute function public.queue_package_pricing_from_activity_source();

do $$
declare source_table text;
begin
  foreach source_table in array array['activity_variants','activity_participant_prices','activity_charges'] loop
    execute format('drop trigger if exists %I on public.%I', source_table || '_package_pricing_queue', source_table);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.queue_package_pricing_from_activity_source()', source_table || '_package_pricing_queue', source_table);
  end loop;
end;
$$;

drop trigger if exists vehicle_rates_package_pricing_queue on public.vehicle_rate_cards;
create trigger vehicle_rates_package_pricing_queue
after insert or update or delete on public.vehicle_rate_cards
for each row execute function public.queue_package_pricing_from_vehicle_rate();

alter table public.package_price_matrix enable row level security;
alter table public.package_price_matrix force row level security;
alter table public.package_pricing_refresh_queue enable row level security;
alter table public.package_pricing_refresh_queue force row level security;

create policy package_price_matrix_admin_select on public.package_price_matrix
for select to authenticated using(
  public.has_permission('packages.view') or
  public.has_permission('packages.update') or
  public.has_permission('packages.manage_pricing')
);
create policy package_price_matrix_public_select on public.package_price_matrix
for select to anon using(exists(
  select 1 from public.packages p
  where p.id = package_id and p.status = 'published'
    and p.pricing_status = 'ready'
    and p.calculated_pricing_revision = pricing_revision
));

grant select on public.package_price_matrix to anon, authenticated;
revoke all on public.package_pricing_refresh_queue from public, anon, authenticated;
revoke all on function public.enqueue_package_pricing(uuid) from public, anon, authenticated;
revoke all on function public.queue_package_pricing_from_package_child() from public, anon, authenticated;
revoke all on function public.queue_package_pricing_from_package() from public, anon, authenticated;
revoke all on function public.enforce_package_pricing_before_publish() from public, anon, authenticated;
revoke all on function public.queue_package_pricing_from_day_child() from public, anon, authenticated;
revoke all on function public.queue_package_pricing_from_hotel_rate() from public, anon, authenticated;
revoke all on function public.queue_package_pricing_from_activity_source() from public, anon, authenticated;
revoke all on function public.queue_package_pricing_from_vehicle_rate() from public, anon, authenticated;
revoke all on function public.replace_package_price_matrix(uuid,jsonb,bigint) from public, anon, authenticated;
revoke all on function public.claim_package_pricing_refresh(integer) from public, anon, authenticated;
grant execute on function public.replace_package_price_matrix(uuid,jsonb,bigint) to service_role;
grant execute on function public.claim_package_pricing_refresh(integer) to service_role;

insert into public.package_pricing_refresh_queue(package_id, requested_revision)
select id, pricing_revision from public.packages
on conflict(package_id) do update
set requested_revision = excluded.requested_revision, requested_at = now();

commit;
