begin;

-- Protect price overrides based on both the existing and resulting scope.
create or replace function public.enforce_hotel_rate_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  linked_location uuid;
  linked_hotel uuid;
  linked_category uuid;
begin
  if new.hotel_id is not null then
    select location_id into linked_location from public.hotels where id = new.hotel_id;
    if linked_location is null or linked_location <> new.location_id then
      raise exception 'The selected hotel does not belong to this location.';
    end if;
  end if;

  if new.room_id is not null then
    select hotel_id, category_id into linked_hotel, linked_category
    from public.hotel_rooms where id = new.room_id;
    if linked_hotel is null or linked_hotel <> new.hotel_id then
      raise exception 'The selected room does not belong to this hotel.';
    end if;
    if linked_category <> new.category_id then
      raise exception 'The rate category must match the room category.';
    end if;
  end if;

  if auth.role() <> 'service_role'
    and (new.hotel_id is not null or (tg_op = 'UPDATE' and old.hotel_id is not null))
    and not public.has_permission('hotels.override_price')
  then
    raise exception 'Missing required permission: hotels.override_price';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_hotel_rate_scope() from public, anon, authenticated;

-- Enforce the dedicated public Hotels media folder for direct SQL/REST and RPC writes.
create or replace function public.enforce_hotel_featured_media()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  asset_changed boolean;
begin
  if tg_op = 'INSERT' then
    asset_changed := true;
  else
    asset_changed := new.featured_image_asset_id is distinct from old.featured_image_asset_id;
  end if;

  if new.featured_image_asset_id is not null and asset_changed
    and not exists (
      select 1 from public.media_assets media
      where media.id = new.featured_image_asset_id
        and media.status = 'active'
        and media.media_type = 'image'
        and media.is_public
        and media.folder = '/awesomeroutes/hotels'
    )
  then
    raise exception 'Hotel images must come from the active Hotels Media Library folder.';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_hotel_gallery_media()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.media_assets media
    where media.id = new.media_asset_id
      and media.status = 'active'
      and media.media_type = 'image'
      and media.is_public
      and media.folder = '/awesomeroutes/hotels'
  )
  then
    raise exception 'Hotel images must come from the active Hotels Media Library folder.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_hotel_featured_media() from public, anon, authenticated;
revoke all on function public.enforce_hotel_gallery_media() from public, anon, authenticated;

drop trigger if exists hotels_enforce_featured_media on public.hotels;
create trigger hotels_enforce_featured_media before insert or update of featured_image_asset_id
on public.hotels for each row execute function public.enforce_hotel_featured_media();
drop trigger if exists hotel_rooms_enforce_featured_media on public.hotel_rooms;
create trigger hotel_rooms_enforce_featured_media before insert or update of featured_image_asset_id
on public.hotel_rooms for each row execute function public.enforce_hotel_featured_media();
drop trigger if exists hotel_media_enforce_asset on public.hotel_media;
create trigger hotel_media_enforce_asset before insert or update of media_asset_id
on public.hotel_media for each row execute function public.enforce_hotel_gallery_media();
drop trigger if exists hotel_room_media_enforce_asset on public.hotel_room_media;
create trigger hotel_room_media_enforce_asset before insert or update of media_asset_id
on public.hotel_room_media for each row execute function public.enforce_hotel_gallery_media();

-- Browser validation is not a security boundary because authenticated users can
-- also write through PostgREST. NOT VALID avoids blocking deployment because of
-- legacy rows while still enforcing the rule for every new or changed row.
alter table public.hotels
  add constraint hotels_website_http_protocol_check
  check (website_url is null or website_url ~* '^https?://') not valid;

-- Cascading foreign-key deletes run as part of the parent delete. Protect priced
-- hotels and rooms at the parent boundary so a delete permission cannot silently
-- remove pricing maintained by a different role.
create or replace function public.enforce_hotel_parent_delete_pricing_permission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  has_linked_rates boolean;
begin
  if tg_table_name = 'hotels' then
    select exists (
      select 1 from public.hotel_rate_cards rate where rate.hotel_id = old.id
    ) into has_linked_rates;
  elsif tg_table_name = 'hotel_rooms' then
    select exists (
      select 1 from public.hotel_rate_cards rate where rate.room_id = old.id
    ) into has_linked_rates;
  else
    raise exception 'Unexpected pricing parent table.';
  end if;

  if auth.role() <> 'service_role' and has_linked_rates then
    if not public.has_permission('hotels.manage_pricing') then
      raise exception 'This record has price overrides. Missing required permission: hotels.manage_pricing';
    end if;
    if not public.has_permission('hotels.override_price') then
      raise exception 'This record has price overrides. Missing required permission: hotels.override_price';
    end if;
  end if;

  return old;
end;
$$;
revoke all on function public.enforce_hotel_parent_delete_pricing_permission()
  from public, anon, authenticated;

drop trigger if exists hotels_protect_pricing_on_delete on public.hotels;
create trigger hotels_protect_pricing_on_delete before delete on public.hotels
for each row execute function public.enforce_hotel_parent_delete_pricing_permission();
drop trigger if exists hotel_rooms_protect_pricing_on_delete on public.hotel_rooms;
create trigger hotel_rooms_protect_pricing_on_delete before delete on public.hotel_rooms
for each row execute function public.enforce_hotel_parent_delete_pricing_permission();

-- Create-only users may read and extend only hotels they created themselves.
drop policy if exists hotels_select_rbac on public.hotels;
create policy hotels_select_rbac on public.hotels for select to authenticated using (
  public.has_permission('hotels.view') or public.has_permission('hotels.update')
  or public.has_permission('hotels.manage_pricing')
  or (public.has_permission('hotels.create') and created_by = (select auth.uid()))
);

drop policy if exists hotel_amenity_assignments_select_rbac on public.hotel_amenity_assignments;
create policy hotel_amenity_assignments_select_rbac on public.hotel_amenity_assignments
for select to authenticated using (
  public.has_permission('hotels.view') or public.has_permission('hotels.update')
  or public.has_permission('hotels.manage_pricing')
  or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotels hotel
    where hotel.id = hotel_amenity_assignments.hotel_id
      and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_media_select_rbac on public.hotel_media;
create policy hotel_media_select_rbac on public.hotel_media for select to authenticated using (
  public.has_permission('hotels.view') or public.has_permission('hotels.update')
  or public.has_permission('hotels.manage_pricing')
  or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotels hotel
    where hotel.id = hotel_media.hotel_id and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_rooms_select_rbac on public.hotel_rooms;
create policy hotel_rooms_select_rbac on public.hotel_rooms for select to authenticated using (
  public.has_permission('hotels.view') or public.has_permission('hotels.update')
  or public.has_permission('hotels.manage_pricing')
  or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotels hotel
    where hotel.id = hotel_rooms.hotel_id and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_room_media_select_rbac on public.hotel_room_media;
create policy hotel_room_media_select_rbac on public.hotel_room_media for select to authenticated using (
  public.has_permission('hotels.view') or public.has_permission('hotels.update')
  or public.has_permission('hotels.manage_pricing')
  or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotel_rooms room
    join public.hotels hotel on hotel.id = room.hotel_id
    where room.id = hotel_room_media.hotel_room_id
      and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_amenity_assignments_insert_rbac on public.hotel_amenity_assignments;
create policy hotel_amenity_assignments_insert_rbac on public.hotel_amenity_assignments
for insert to authenticated with check (
  public.has_permission('hotels.update') or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotels hotel
    where hotel.id = hotel_amenity_assignments.hotel_id
      and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_media_insert_rbac on public.hotel_media;
create policy hotel_media_insert_rbac on public.hotel_media for insert to authenticated with check (
  public.has_permission('hotels.update') or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotels hotel
    where hotel.id = hotel_media.hotel_id and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_rooms_insert_rbac on public.hotel_rooms;
create policy hotel_rooms_insert_rbac on public.hotel_rooms for insert to authenticated with check (
  public.has_permission('hotels.update') or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotels hotel
    where hotel.id = hotel_rooms.hotel_id and hotel.created_by = (select auth.uid())
  ))
);

drop policy if exists hotel_room_media_insert_rbac on public.hotel_room_media;
create policy hotel_room_media_insert_rbac on public.hotel_room_media for insert to authenticated with check (
  public.has_permission('hotels.update') or (public.has_permission('hotels.create') and exists (
    select 1 from public.hotel_rooms room
    join public.hotels hotel on hotel.id = room.hotel_id
    where room.id = hotel_room_media.hotel_room_id
      and hotel.created_by = (select auth.uid())
  ))
);

-- Deleting rate cards always requires pricing management.
drop policy if exists hotel_rates_delete_rbac on public.hotel_rate_cards;
create policy hotel_rates_delete_rbac on public.hotel_rate_cards for delete to authenticated using (
  public.has_permission('hotels.manage_pricing')
  and (hotel_id is null or public.has_permission('hotels.override_price'))
);

-- Raw supplier rates, internal notes and exact inventory are not public APIs.
drop policy if exists hotel_rates_public on public.hotel_rate_cards;
revoke select (
  id, location_id, category_id, hotel_id, room_id, meal_plan,
  base_room_rate_paise, extra_adult_bed_paise, child_with_bed_paise,
  child_without_bed_paise, infant_sharing_paise, child_pricing_policy,
  child_with_bed_allowed, child_without_bed_allowed, currency,
  tax_included, notes, status
) on public.hotel_rate_cards from anon;
revoke select (inventory_count) on public.hotel_rooms from anon;

-- Only publish hotels through an active geographic hierarchy.
drop policy if exists hotels_public on public.hotels;
create policy hotels_public on public.hotels for select to anon using (
  status = 'active' and exists (
    select 1 from public.locations location
    join public.destinations destination on destination.id = location.destination_id
    join public.regions region on region.id = destination.region_id
    join public.countries country on country.id = region.country_id
    where location.id = hotels.location_id and location.status = 'active'
      and destination.status = 'active' and region.status = 'active'
      and country.status = 'active'
  )
);

drop policy if exists hotel_assignments_public on public.hotel_amenity_assignments;
create policy hotel_assignments_public on public.hotel_amenity_assignments for select to anon using (
  exists (
    select 1 from public.hotels hotel
    join public.hotel_amenities amenity on amenity.id = hotel_amenity_assignments.amenity_id
    where hotel.id = hotel_amenity_assignments.hotel_id
      and hotel.status = 'active' and amenity.status = 'active'
  )
);

drop policy if exists hotel_media_public on public.hotel_media;
create policy hotel_media_public on public.hotel_media for select to anon using (
  exists (
    select 1 from public.hotels hotel
    join public.media_assets media on media.id = hotel_media.media_asset_id
    where hotel.id = hotel_media.hotel_id and hotel.status = 'active'
      and media.status = 'active' and media.media_type = 'image'
      and media.is_public and media.folder = '/awesomeroutes/hotels'
  )
);

drop policy if exists hotel_rooms_public on public.hotel_rooms;
create policy hotel_rooms_public on public.hotel_rooms for select to anon using (
  status = 'active' and exists (
    select 1 from public.hotels hotel
    join public.hotel_categories category on category.id = hotel_rooms.category_id
    where hotel.id = hotel_rooms.hotel_id and hotel.status = 'active'
      and category.status = 'active'
  )
);

drop policy if exists hotel_room_media_public on public.hotel_room_media;
create policy hotel_room_media_public on public.hotel_room_media for select to anon using (
  exists (
    select 1 from public.hotel_rooms room
    join public.hotels hotel on hotel.id = room.hotel_id
    join public.hotel_categories category on category.id = room.category_id
    join public.media_assets media on media.id = hotel_room_media.media_asset_id
    where room.id = hotel_room_media.hotel_room_id and room.status = 'active'
      and hotel.status = 'active' and category.status = 'active'
      and media.status = 'active' and media.media_type = 'image'
      and media.is_public and media.folder = '/awesomeroutes/hotels'
  )
);

commit;
