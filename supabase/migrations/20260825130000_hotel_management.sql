begin;

insert into public.permissions (module, action, permission_key, description) values
  ('hotels','view','hotels.view','View hotels, rooms, amenities and rates'),
  ('hotels','create','hotels.create','Create hotels and room types'),
  ('hotels','update','hotels.update','Update hotel content, rooms and policies'),
  ('hotels','delete','hotels.delete','Delete unused hotels and rooms'),
  ('hotels','manage_pricing','hotels.manage_pricing','Manage location and hotel room rates'),
  ('hotels','override_price','hotels.override_price','Override location-category hotel rates')
on conflict (permission_key) do update set module=excluded.module, action=excluded.action, description=excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug='super_admin' and p.module='hotels'
on conflict do nothing;

create table public.hotel_categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null,
  description text, display_order integer not null default 0 check(display_order>=0),
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint hotel_categories_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index hotel_categories_name_uidx on public.hotel_categories(lower(name));
create unique index hotel_categories_slug_uidx on public.hotel_categories(lower(slug));
create index hotel_categories_status_order_idx on public.hotel_categories(status,display_order,name);
insert into public.hotel_categories(name,slug,display_order) values
 ('Value','value',10),('Comfort','comfort',20),('Signature','signature',30),('Elite','elite',40),('Royal','royal',50)
on conflict do nothing;

create table public.hotel_amenities (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null,
  icon_key text, display_order integer not null default 0 check(display_order>=0),
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint hotel_amenities_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index hotel_amenities_name_uidx on public.hotel_amenities(lower(name));
create unique index hotel_amenities_slug_uidx on public.hotel_amenities(lower(slug));
create index hotel_amenities_status_order_idx on public.hotel_amenities(status,display_order,name);
insert into public.hotel_amenities(name,slug,display_order) values
 ('Wi-Fi','wifi',10),('Parking','parking',20),('Restaurant','restaurant',30),
 ('Room Service','room-service',40),('Hot Water','hot-water',50),('Power Backup','power-backup',60),
 ('Heating','heating',70),('Air Conditioning','air-conditioning',80),
 ('Family Rooms','family-rooms',90),('Accessible Rooms','accessible-rooms',100)
on conflict do nothing;

create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete restrict,
  name text not null, slug text not null, short_description text, description text, address text,
  latitude numeric(9,6) check(latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check(longitude is null or longitude between -180 and 180),
  phone text, email text, website_url text,
  star_rating numeric(2,1) check(star_rating is null or star_rating between 0 and 5),
  check_in_time time, check_out_time time, policies text,
  featured_image_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check(status in ('draft','active','temporarily_unavailable','inactive')),
  is_featured boolean not null default false, seo_title text, seo_description text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint hotels_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index hotels_location_slug_uidx on public.hotels(location_id,lower(slug));
create index hotels_location_status_name_idx on public.hotels(location_id,status,name);
create index hotels_status_created_idx on public.hotels(status,created_at desc);

create table public.hotel_amenity_assignments (
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  amenity_id uuid not null references public.hotel_amenities(id) on delete restrict,
  created_at timestamptz not null default now(), primary key(hotel_id,amenity_id)
);
create index hotel_amenity_assignments_amenity_idx on public.hotel_amenity_assignments(amenity_id,hotel_id);

create table public.hotel_media (
  id uuid primary key default gen_random_uuid(), hotel_id uuid not null references public.hotels(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  display_order integer not null default 0 check(display_order>=0), alt_text text, caption text,
  created_at timestamptz not null default now(), unique(hotel_id,media_asset_id)
);
create index hotel_media_hotel_order_idx on public.hotel_media(hotel_id,display_order,created_at);

create table public.hotel_rooms (
  id uuid primary key default gen_random_uuid(), hotel_id uuid not null references public.hotels(id) on delete cascade,
  category_id uuid not null references public.hotel_categories(id) on delete restrict,
  name text not null, slug text not null, description text, bed_type text,
  room_size_sqft numeric(7,2) check(room_size_sqft is null or room_size_sqft>0),
  base_adults smallint not null default 2 check(base_adults>0),
  maximum_adults smallint not null default 3 check(maximum_adults>=base_adults),
  maximum_children smallint not null default 2 check(maximum_children>=0),
  maximum_occupancy smallint not null default 4 check(maximum_occupancy>=maximum_adults),
  maximum_extra_beds smallint not null default 1 check(maximum_extra_beds>=0),
  child_sharing_allowed boolean not null default true, infant_sharing_allowed boolean not null default true,
  inventory_count integer check(inventory_count is null or inventory_count>=0),
  featured_image_asset_id uuid references public.media_assets(id) on delete set null,
  display_order integer not null default 0 check(display_order>=0),
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint hotel_rooms_slug_check check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create unique index hotel_rooms_hotel_slug_uidx on public.hotel_rooms(hotel_id,lower(slug));
create index hotel_rooms_hotel_status_order_idx on public.hotel_rooms(hotel_id,status,display_order,name);
create index hotel_rooms_category_status_idx on public.hotel_rooms(category_id,status);

create table public.hotel_room_media (
  id uuid primary key default gen_random_uuid(), hotel_room_id uuid not null references public.hotel_rooms(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  display_order integer not null default 0 check(display_order>=0), alt_text text, caption text,
  created_at timestamptz not null default now(), unique(hotel_room_id,media_asset_id)
);
create index hotel_room_media_room_order_idx on public.hotel_room_media(hotel_room_id,display_order,created_at);

create table public.hotel_rate_cards (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete restrict,
  category_id uuid not null references public.hotel_categories(id) on delete restrict,
  hotel_id uuid references public.hotels(id) on delete cascade,
  room_id uuid references public.hotel_rooms(id) on delete cascade,
  meal_plan text not null default 'CP' check(meal_plan in ('EP','CP','MAP','AP')),
  base_room_rate_paise bigint not null check(base_room_rate_paise>=0),
  extra_adult_bed_paise bigint not null default 0 check(extra_adult_bed_paise>=0),
  child_with_bed_paise bigint not null default 0 check(child_with_bed_paise>=0),
  child_without_bed_paise bigint not null default 0 check(child_without_bed_paise>=0),
  infant_sharing_paise bigint not null default 0 check(infant_sharing_paise>=0),
  child_pricing_policy text not null default 'child_rates' check(child_pricing_policy in ('child_rates','adult_rate')),
  child_with_bed_allowed boolean not null default true,
  child_without_bed_allowed boolean not null default true,
  currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
  tax_included boolean not null default true check(tax_included), notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint hotel_rate_scope_check check(room_id is null or hotel_id is not null),
  constraint hotel_rate_child_policy_check check(child_pricing_policy<>'adult_rate' or not child_without_bed_allowed)
);
create unique index hotel_rates_location_default_uidx on public.hotel_rate_cards(location_id,category_id,meal_plan) where hotel_id is null and room_id is null;
create unique index hotel_rates_hotel_override_uidx on public.hotel_rate_cards(location_id,category_id,hotel_id,meal_plan) where hotel_id is not null and room_id is null;
create unique index hotel_rates_room_override_uidx on public.hotel_rate_cards(room_id,meal_plan) where room_id is not null;
create index hotel_rates_location_category_idx on public.hotel_rate_cards(location_id,category_id,status,meal_plan);

create or replace function public.set_hotel_updated_at() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end $$;
create or replace function public.set_hotel_audit_fields() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then new.created_at=now(); new.updated_at=now(); new.created_by=coalesce(auth.uid(),new.created_by); new.updated_by=coalesce(auth.uid(),new.updated_by);
 else new.created_at=old.created_at; new.created_by=old.created_by; new.updated_at=now(); new.updated_by=coalesce(auth.uid(),old.updated_by); end if;
 return new;
end $$;
revoke all on function public.set_hotel_updated_at() from public,anon,authenticated;
revoke all on function public.set_hotel_audit_fields() from public,anon,authenticated;
create trigger hotel_categories_updated before update on public.hotel_categories for each row execute function public.set_hotel_updated_at();
create trigger hotel_amenities_updated before update on public.hotel_amenities for each row execute function public.set_hotel_updated_at();
create trigger hotels_audit_fields before insert or update on public.hotels for each row execute function public.set_hotel_audit_fields();
create trigger hotel_rooms_updated before update on public.hotel_rooms for each row execute function public.set_hotel_updated_at();
create trigger hotel_rates_audit_fields before insert or update on public.hotel_rate_cards for each row execute function public.set_hotel_audit_fields();

create or replace function public.enforce_hotel_rate_scope() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare linked_location uuid; linked_hotel uuid; linked_category uuid;
begin
 if new.hotel_id is not null then
  select location_id into linked_location from public.hotels where id=new.hotel_id;
  if linked_location is null or linked_location<>new.location_id then raise exception 'The selected hotel does not belong to this location.'; end if;
 end if;
 if new.room_id is not null then
  select hotel_id,category_id into linked_hotel,linked_category from public.hotel_rooms where id=new.room_id;
  if linked_hotel is null or linked_hotel<>new.hotel_id then raise exception 'The selected room does not belong to this hotel.'; end if;
  if linked_category<>new.category_id then raise exception 'The rate category must match the room category.'; end if;
 end if;
 if auth.role()<>'service_role' and new.hotel_id is not null and not public.has_permission('hotels.override_price') then
  raise exception 'Missing required permission: hotels.override_price';
 end if;
 return new;
end $$;
revoke all on function public.enforce_hotel_rate_scope() from public,anon,authenticated;
create trigger hotel_rates_enforce_scope before insert or update on public.hotel_rate_cards for each row execute function public.enforce_hotel_rate_scope();

create or replace function public.save_hotel_with_gallery(p_hotel_id uuid,p_hotel jsonb,p_gallery_asset_ids uuid[],p_amenity_ids uuid[])
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved_id uuid; featured_id uuid; gallery_ids uuid[]:=coalesce(p_gallery_asset_ids,'{}'::uuid[]); amenity_ids uuid[]:=coalesce(p_amenity_ids,'{}'::uuid[]); expected integer; valid integer;
begin
 if coalesce(array_length(gallery_ids,1),0)>40 then raise exception 'A hotel gallery supports a maximum of 40 images.'; end if;
 featured_id:=nullif(p_hotel->>'featured_image_asset_id','')::uuid;
 select count(distinct x) into expected from unnest(gallery_ids||case when featured_id is null then '{}'::uuid[] else array[featured_id] end)x;
 select count(*) into valid from public.media_assets where id=any(gallery_ids||case when featured_id is null then '{}'::uuid[] else array[featured_id] end) and status='active' and media_type='image';
 if valid<>expected then raise exception 'One or more selected hotel images are unavailable.'; end if;
 select count(distinct x) into expected from unnest(amenity_ids)x;
 select count(*) into valid from public.hotel_amenities where id=any(amenity_ids) and status='active';
 if valid<>expected then raise exception 'One or more selected amenities are unavailable.'; end if;
 if p_hotel_id is null then
  insert into public.hotels(location_id,name,slug,short_description,description,address,latitude,longitude,phone,email,website_url,star_rating,check_in_time,check_out_time,policies,featured_image_asset_id,status,is_featured,seo_title,seo_description,created_by,updated_by)
  values((p_hotel->>'location_id')::uuid,p_hotel->>'name',p_hotel->>'slug',p_hotel->>'short_description',p_hotel->>'description',p_hotel->>'address',(p_hotel->>'latitude')::numeric,(p_hotel->>'longitude')::numeric,p_hotel->>'phone',p_hotel->>'email',p_hotel->>'website_url',(p_hotel->>'star_rating')::numeric,(p_hotel->>'check_in_time')::time,(p_hotel->>'check_out_time')::time,p_hotel->>'policies',featured_id,p_hotel->>'status',coalesce((p_hotel->>'is_featured')::boolean,false),p_hotel->>'seo_title',p_hotel->>'seo_description',auth.uid(),auth.uid()) returning id into saved_id;
 else
  update public.hotels set location_id=(p_hotel->>'location_id')::uuid,name=p_hotel->>'name',slug=p_hotel->>'slug',short_description=p_hotel->>'short_description',description=p_hotel->>'description',address=p_hotel->>'address',latitude=(p_hotel->>'latitude')::numeric,longitude=(p_hotel->>'longitude')::numeric,phone=p_hotel->>'phone',email=p_hotel->>'email',website_url=p_hotel->>'website_url',star_rating=(p_hotel->>'star_rating')::numeric,check_in_time=(p_hotel->>'check_in_time')::time,check_out_time=(p_hotel->>'check_out_time')::time,policies=p_hotel->>'policies',featured_image_asset_id=featured_id,status=p_hotel->>'status',is_featured=coalesce((p_hotel->>'is_featured')::boolean,false),seo_title=p_hotel->>'seo_title',seo_description=p_hotel->>'seo_description',updated_by=auth.uid() where id=p_hotel_id returning id into saved_id;
  if saved_id is null then raise exception 'Hotel was not found or cannot be updated.'; end if;
 end if;
 delete from public.hotel_media where hotel_id=saved_id;
 insert into public.hotel_media(hotel_id,media_asset_id,display_order) select saved_id,x.asset_id,x.ordinal-1 from (select distinct on(asset_id)asset_id,ordinal from unnest(gallery_ids)with ordinality t(asset_id,ordinal)order by asset_id,ordinal)x order by x.ordinal;
 delete from public.hotel_amenity_assignments where hotel_id=saved_id;
 insert into public.hotel_amenity_assignments(hotel_id,amenity_id) select saved_id,x from unnest(amenity_ids)x on conflict do nothing;
 return saved_id;
end $$;

create or replace function public.save_hotel_room_with_gallery(p_room_id uuid,p_room jsonb,p_gallery_asset_ids uuid[])
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved_id uuid; featured_id uuid; gallery_ids uuid[]:=coalesce(p_gallery_asset_ids,'{}'::uuid[]); expected integer; valid integer;
begin
 if coalesce(array_length(gallery_ids,1),0)>20 then raise exception 'A room gallery supports a maximum of 20 images.'; end if;
 featured_id:=nullif(p_room->>'featured_image_asset_id','')::uuid;
 select count(distinct x) into expected from unnest(gallery_ids||case when featured_id is null then '{}'::uuid[] else array[featured_id] end)x;
 select count(*) into valid from public.media_assets where id=any(gallery_ids||case when featured_id is null then '{}'::uuid[] else array[featured_id] end) and status='active' and media_type='image';
 if valid<>expected then raise exception 'One or more selected room images are unavailable.'; end if;
 if p_room_id is null then
  insert into public.hotel_rooms(hotel_id,category_id,name,slug,description,bed_type,room_size_sqft,base_adults,maximum_adults,maximum_children,maximum_occupancy,maximum_extra_beds,child_sharing_allowed,infant_sharing_allowed,inventory_count,featured_image_asset_id,display_order,status)
  values((p_room->>'hotel_id')::uuid,(p_room->>'category_id')::uuid,p_room->>'name',p_room->>'slug',p_room->>'description',p_room->>'bed_type',(p_room->>'room_size_sqft')::numeric,(p_room->>'base_adults')::smallint,(p_room->>'maximum_adults')::smallint,(p_room->>'maximum_children')::smallint,(p_room->>'maximum_occupancy')::smallint,(p_room->>'maximum_extra_beds')::smallint,(p_room->>'child_sharing_allowed')::boolean,(p_room->>'infant_sharing_allowed')::boolean,(p_room->>'inventory_count')::integer,featured_id,(p_room->>'display_order')::integer,p_room->>'status') returning id into saved_id;
 else
  update public.hotel_rooms set category_id=(p_room->>'category_id')::uuid,name=p_room->>'name',slug=p_room->>'slug',description=p_room->>'description',bed_type=p_room->>'bed_type',room_size_sqft=(p_room->>'room_size_sqft')::numeric,base_adults=(p_room->>'base_adults')::smallint,maximum_adults=(p_room->>'maximum_adults')::smallint,maximum_children=(p_room->>'maximum_children')::smallint,maximum_occupancy=(p_room->>'maximum_occupancy')::smallint,maximum_extra_beds=(p_room->>'maximum_extra_beds')::smallint,child_sharing_allowed=(p_room->>'child_sharing_allowed')::boolean,infant_sharing_allowed=(p_room->>'infant_sharing_allowed')::boolean,inventory_count=(p_room->>'inventory_count')::integer,featured_image_asset_id=featured_id,display_order=(p_room->>'display_order')::integer,status=p_room->>'status' where id=p_room_id and hotel_id=(p_room->>'hotel_id')::uuid returning id into saved_id;
  if saved_id is null then raise exception 'Room was not found or cannot be updated.'; end if;
 end if;
 delete from public.hotel_room_media where hotel_room_id=saved_id;
 insert into public.hotel_room_media(hotel_room_id,media_asset_id,display_order) select saved_id,x.asset_id,x.ordinal-1 from (select distinct on(asset_id)asset_id,ordinal from unnest(gallery_ids)with ordinality t(asset_id,ordinal)order by asset_id,ordinal)x order by x.ordinal;
 return saved_id;
end $$;
revoke all on function public.save_hotel_with_gallery(uuid,jsonb,uuid[],uuid[]) from public,anon;
grant execute on function public.save_hotel_with_gallery(uuid,jsonb,uuid[],uuid[]) to authenticated;
revoke all on function public.save_hotel_room_with_gallery(uuid,jsonb,uuid[]) from public,anon;
grant execute on function public.save_hotel_room_with_gallery(uuid,jsonb,uuid[]) to authenticated;

alter table public.hotel_categories enable row level security; alter table public.hotel_amenities enable row level security;
alter table public.hotels enable row level security; alter table public.hotel_amenity_assignments enable row level security;
alter table public.hotel_media enable row level security; alter table public.hotel_rooms enable row level security;
alter table public.hotel_room_media enable row level security; alter table public.hotel_rate_cards enable row level security;

create policy locations_select_hotel_dependency on public.locations for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update')or public.has_permission('hotels.manage_pricing'));
create policy destinations_select_hotel_dependency on public.destinations for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update')or public.has_permission('hotels.manage_pricing'));
create policy regions_select_hotel_dependency on public.regions for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update')or public.has_permission('hotels.manage_pricing'));
create policy countries_select_hotel_dependency on public.countries for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update')or public.has_permission('hotels.manage_pricing'));

create policy hotel_categories_rbac on public.hotel_categories for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update')or public.has_permission('hotels.manage_pricing'));
create policy hotel_amenities_rbac on public.hotel_amenities for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update'));
create policy hotels_select_rbac on public.hotels for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.create')or public.has_permission('hotels.update')or public.has_permission('hotels.manage_pricing'));
create policy hotels_insert_rbac on public.hotels for insert to authenticated with check(public.has_permission('hotels.create')and created_by=auth.uid());
create policy hotels_update_rbac on public.hotels for update to authenticated using(public.has_permission('hotels.update'))with check(public.has_permission('hotels.update'));
create policy hotels_delete_rbac on public.hotels for delete to authenticated using(public.has_permission('hotels.delete'));
do $$ declare t text; begin foreach t in array array['hotel_amenity_assignments','hotel_media','hotel_rooms','hotel_room_media'] loop
 execute format('create policy %I on public.%I for select to authenticated using(public.has_permission(''hotels.view'')or public.has_permission(''hotels.create'')or public.has_permission(''hotels.update'')or public.has_permission(''hotels.manage_pricing''))',t||'_select_rbac',t);
 execute format('create policy %I on public.%I for insert to authenticated with check(public.has_permission(''hotels.create'')or public.has_permission(''hotels.update''))',t||'_insert_rbac',t);
 execute format('create policy %I on public.%I for update to authenticated using(public.has_permission(''hotels.update''))with check(public.has_permission(''hotels.update''))',t||'_update_rbac',t);
 execute format('create policy %I on public.%I for delete to authenticated using(public.has_permission(''hotels.update'')or public.has_permission(''hotels.delete''))',t||'_delete_rbac',t);
 end loop; end $$;
create policy hotel_rates_select_rbac on public.hotel_rate_cards for select to authenticated using(public.has_permission('hotels.view')or public.has_permission('hotels.manage_pricing')or public.has_permission('hotels.update'));
create policy hotel_rates_insert_rbac on public.hotel_rate_cards for insert to authenticated with check(public.has_permission('hotels.manage_pricing')and created_by=auth.uid());
create policy hotel_rates_update_rbac on public.hotel_rate_cards for update to authenticated using(public.has_permission('hotels.manage_pricing'))with check(public.has_permission('hotels.manage_pricing'));
create policy hotel_rates_delete_rbac on public.hotel_rate_cards for delete to authenticated using(
  (public.has_permission('hotels.manage_pricing')or public.has_permission('hotels.delete'))
  and (hotel_id is null or public.has_permission('hotels.override_price'))
);

create policy hotel_categories_public on public.hotel_categories for select to anon using(status='active');
create policy hotel_amenities_public on public.hotel_amenities for select to anon using(status='active');
create policy hotels_public on public.hotels for select to anon using(status='active');
create policy hotel_assignments_public on public.hotel_amenity_assignments for select to anon using(exists(select 1 from public.hotels h where h.id=hotel_id and h.status='active'));
create policy hotel_media_public on public.hotel_media for select to anon using(exists(select 1 from public.hotels h where h.id=hotel_id and h.status='active'));
create policy hotel_rooms_public on public.hotel_rooms for select to anon using(status='active'and exists(select 1 from public.hotels h where h.id=hotel_id and h.status='active'));
create policy hotel_room_media_public on public.hotel_room_media for select to anon using(exists(select 1 from public.hotel_rooms r join public.hotels h on h.id=r.hotel_id where r.id=hotel_room_id and r.status='active'and h.status='active'));
create policy hotel_rates_public on public.hotel_rate_cards for select to anon using(status='active'and(hotel_id is null or exists(select 1 from public.hotels h where h.id=hotel_id and h.status='active')));

grant select,insert,update,delete on public.hotels,public.hotel_amenity_assignments,public.hotel_media,public.hotel_rooms,public.hotel_room_media,public.hotel_rate_cards to authenticated;
grant select on public.hotel_categories,public.hotel_amenities to authenticated;
grant select(id,name,slug,description,display_order,status) on public.hotel_categories to anon;
grant select(id,name,slug,icon_key,display_order,status) on public.hotel_amenities to anon;
grant select(id,location_id,name,slug,short_description,description,address,latitude,longitude,phone,email,website_url,star_rating,check_in_time,check_out_time,policies,featured_image_asset_id,status,is_featured,seo_title,seo_description) on public.hotels to anon;
grant select(hotel_id,amenity_id) on public.hotel_amenity_assignments to anon;
grant select(id,hotel_id,media_asset_id,display_order,alt_text,caption) on public.hotel_media to anon;
grant select(id,hotel_id,category_id,name,slug,description,bed_type,room_size_sqft,base_adults,maximum_adults,maximum_children,maximum_occupancy,maximum_extra_beds,child_sharing_allowed,infant_sharing_allowed,inventory_count,featured_image_asset_id,display_order,status) on public.hotel_rooms to anon;
grant select(id,hotel_room_id,media_asset_id,display_order,alt_text,caption) on public.hotel_room_media to anon;
grant select(id,location_id,category_id,hotel_id,room_id,meal_plan,base_room_rate_paise,extra_adult_bed_paise,child_with_bed_paise,child_without_bed_paise,infant_sharing_paise,child_pricing_policy,child_with_bed_allowed,child_without_bed_allowed,currency,tax_included,notes,status) on public.hotel_rate_cards to anon;

do $$ declare t text; begin foreach t in array array['hotel_categories','hotel_amenities','hotels','hotel_amenity_assignments','hotel_media','hotel_rooms','hotel_room_media','hotel_rate_cards'] loop
 execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_row_audit()',t||'_audit',t);
end loop; end $$;
drop policy hotel_rooms_delete_rbac on public.hotel_rooms;
create policy hotel_rooms_delete_rbac on public.hotel_rooms for delete to authenticated using(public.has_permission('hotels.delete'));

commit;
