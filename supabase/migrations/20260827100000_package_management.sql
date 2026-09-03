begin;

insert into public.permissions (module, action, permission_key, description) values
  ('packages','view','packages.view','View package catalog and itinerary details'),
  ('packages','create','packages.create','Create packages and package content'),
  ('packages','update','packages.update','Update packages and package content'),
  ('packages','delete','packages.delete','Delete unused packages'),
  ('packages','manage_pricing','packages.manage_pricing','Manage package price adjustments and pricing configuration'),
  ('packages','publish','packages.publish','Publish or unpublish packages on the customer website')
on conflict (permission_key) do update set module=excluded.module,action=excluded.action,description=excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug='super_admin' and p.module='packages' on conflict do nothing;

create table public.packages (
 id uuid primary key default gen_random_uuid(),
 primary_destination_id uuid not null references public.destinations(id) on delete restrict,
 start_location_id uuid references public.locations(id) on delete restrict,
 end_location_id uuid references public.locations(id) on delete restrict,
 name text not null check(char_length(name) between 3 and 180),
 slug text not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
 package_code text check(package_code is null or char_length(package_code) between 2 and 40),
 short_description text check(short_description is null or char_length(short_description)<=500),
 description text check(description is null or char_length(description)<=30000),
 duration_days smallint not null check(duration_days between 1 and 90),
 duration_nights smallint not null check(duration_nights between 0 and duration_days),
 featured_image_asset_id uuid references public.media_assets(id) on delete set null,
 is_featured boolean not null default false,
 status text not null default 'draft' check(status in('draft','published','inactive','archived')),
 seo_title text check(seo_title is null or char_length(seo_title)<=70),
 seo_description text check(seo_description is null or char_length(seo_description)<=170),
 published_at timestamptz,
 created_by uuid references auth.users(id) on delete set null default auth.uid(),
 updated_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint packages_publish_check check((status='published' and published_at is not null) or status<>'published')
);
create unique index packages_slug_uidx on public.packages(lower(slug));
create unique index packages_code_uidx on public.packages(lower(package_code)) where package_code is not null;
create index packages_status_destination_idx on public.packages(status,primary_destination_id,created_at desc);
create index packages_published_idx on public.packages(published_at desc) where status='published';

create table public.package_destinations(
 package_id uuid not null references public.packages(id) on delete cascade,
 destination_id uuid not null references public.destinations(id) on delete restrict,
 display_order smallint not null default 0 check(display_order between 0 and 200),
 primary key(package_id,destination_id)
);
create index package_destinations_destination_idx on public.package_destinations(destination_id,package_id);

create table public.package_media(
 id uuid primary key default gen_random_uuid(), package_id uuid not null references public.packages(id) on delete cascade,
 media_asset_id uuid not null references public.media_assets(id) on delete restrict,
 caption text check(caption is null or char_length(caption)<=300),
 display_order smallint not null default 0 check(display_order between 0 and 500), created_at timestamptz not null default now(),
 unique(package_id,media_asset_id)
);
create index package_media_order_idx on public.package_media(package_id,display_order,id);

create table public.package_itinerary_days(
 id uuid primary key default gen_random_uuid(), package_id uuid not null references public.packages(id) on delete cascade,
 day_number smallint not null check(day_number between 1 and 90), title text not null check(char_length(title) between 2 and 180),
 summary text check(summary is null or char_length(summary)<=500), description text check(description is null or char_length(description)<=20000),
 start_location_id uuid references public.locations(id) on delete restrict,
 end_location_id uuid references public.locations(id) on delete restrict,
 overnight_location_id uuid references public.locations(id) on delete restrict,
 distance_km numeric(8,2) check(distance_km is null or distance_km between 0 and 10000),
 travel_minutes integer check(travel_minutes is null or travel_minutes between 0 and 43200),
 vehicle_required boolean not null default true,
 breakfast_included boolean not null default false, lunch_included boolean not null default false, dinner_included boolean not null default false,
 notes text check(notes is null or char_length(notes)<=3000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(package_id,day_number)
);
create index package_days_order_idx on public.package_itinerary_days(package_id,day_number);

create table public.package_day_activities(
 id uuid primary key default gen_random_uuid(), itinerary_day_id uuid not null references public.package_itinerary_days(id) on delete cascade,
 activity_offering_id uuid not null references public.activity_offerings(id) on delete restrict,
 activity_variant_id uuid references public.activity_variants(id) on delete restrict,
 quantity smallint not null default 1 check(quantity between 1 and 100), is_optional boolean not null default false,
 notes text check(notes is null or char_length(notes)<=2000), display_order smallint not null default 0 check(display_order between 0 and 500),
 created_at timestamptz not null default now()
);
create index package_activities_order_idx on public.package_day_activities(itinerary_day_id,display_order,id);
create unique index package_activities_selection_uidx on public.package_day_activities(itinerary_day_id,activity_offering_id,coalesce(activity_variant_id,'00000000-0000-0000-0000-000000000000'::uuid));

create table public.package_day_hotels(
 id uuid primary key default gen_random_uuid(), itinerary_day_id uuid not null references public.package_itinerary_days(id) on delete cascade,
 hotel_category_id uuid not null references public.hotel_categories(id) on delete restrict,
 hotel_id uuid not null references public.hotels(id) on delete restrict,
 hotel_room_id uuid references public.hotel_rooms(id) on delete restrict,
 meal_plan text not null default 'CP' check(meal_plan in('EP','CP','MAP','AP')),
 is_primary boolean not null default true, notes text check(notes is null or char_length(notes)<=2000),
 display_order smallint not null default 0 check(display_order between 0 and 500), created_at timestamptz not null default now()
);
create unique index package_hotels_primary_uidx on public.package_day_hotels(itinerary_day_id,hotel_category_id) where is_primary;
create unique index package_hotels_selection_uidx on public.package_day_hotels(itinerary_day_id,hotel_category_id,hotel_id,coalesce(hotel_room_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index package_hotels_order_idx on public.package_day_hotels(itinerary_day_id,hotel_category_id,display_order);

create table public.package_vehicle_options(
 id uuid primary key default gen_random_uuid(), package_id uuid not null references public.packages(id) on delete cascade,
 minimum_pax smallint not null check(minimum_pax between 1 and 100), maximum_pax smallint not null check(maximum_pax between minimum_pax and 100),
 base_location_id uuid not null references public.locations(id) on delete restrict,
 vehicle_category_id uuid not null references public.vehicle_categories(id) on delete restrict,
 vehicle_model_id uuid references public.vehicle_models(id) on delete restrict, vendor_id uuid references public.transport_vendors(id) on delete restrict,
 quantity smallint not null default 1 check(quantity between 1 and 20), billable_days smallint not null check(billable_days between 1 and 90),
 notes text check(notes is null or char_length(notes)<=2000), display_order smallint not null default 0 check(display_order between 0 and 500),
 created_at timestamptz not null default now()
);
create index package_vehicles_pax_idx on public.package_vehicle_options(package_id,minimum_pax,maximum_pax,display_order);
create unique index package_vehicles_default_uidx on public.package_vehicle_options(package_id,minimum_pax,maximum_pax,vehicle_category_id) where vehicle_model_id is null and vendor_id is null;
create unique index package_vehicles_model_uidx on public.package_vehicle_options(package_id,minimum_pax,maximum_pax,vehicle_category_id,vehicle_model_id) where vehicle_model_id is not null and vendor_id is null;
create unique index package_vehicles_vendor_uidx on public.package_vehicle_options(package_id,minimum_pax,maximum_pax,vehicle_category_id,vendor_id) where vehicle_model_id is null and vendor_id is not null;
create unique index package_vehicles_model_vendor_uidx on public.package_vehicle_options(package_id,minimum_pax,maximum_pax,vehicle_category_id,vehicle_model_id,vendor_id) where vehicle_model_id is not null and vendor_id is not null;

create table public.package_content_items(
 id uuid primary key default gen_random_uuid(), package_id uuid not null references public.packages(id) on delete cascade,
 item_type text not null check(item_type in('highlight','inclusion','exclusion','important_note')),
 content text not null check(char_length(content) between 1 and 1000), display_order smallint not null default 0 check(display_order between 0 and 500),
 created_at timestamptz not null default now()
);
create index package_content_order_idx on public.package_content_items(package_id,item_type,display_order,id);

create table public.package_faqs(
 id uuid primary key default gen_random_uuid(), package_id uuid not null references public.packages(id) on delete cascade,
 question text not null check(char_length(question) between 3 and 500), answer text not null check(char_length(answer) between 3 and 5000),
 display_order smallint not null default 0 check(display_order between 0 and 500), created_at timestamptz not null default now()
);
create index package_faqs_order_idx on public.package_faqs(package_id,display_order,id);

create table public.package_price_adjustments(
 id uuid primary key default gen_random_uuid(), package_id uuid not null references public.packages(id) on delete cascade,
 hotel_category_id uuid not null references public.hotel_categories(id) on delete restrict,
 markup_bps integer not null default 0 check(markup_bps between -10000 and 100000),
 fixed_adjustment_paise bigint not null default 0 check(fixed_adjustment_paise between -100000000000 and 100000000000),
 rounding_multiple_paise integer not null default 10000 check(rounding_multiple_paise between 1 and 1000000),
 notes text check(notes is null or char_length(notes)<=2000), updated_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(package_id,hotel_category_id)
);

create or replace function public.set_package_updated_at() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 new.updated_at=now();
 if tg_table_name='packages' then
   if exists(select 1 from public.package_itinerary_days d where d.package_id=new.id and d.day_number>new.duration_days) then raise exception 'Remove itinerary days beyond the new package duration first.'; end if;
   if exists(select 1 from public.package_vehicle_options v where v.package_id=new.id and v.billable_days>new.duration_days) then raise exception 'Update vehicle billable days before reducing package duration.'; end if;
   new.updated_by=coalesce(auth.uid(),old.updated_by);
   if new.status='published' and old.status<>'published' then new.published_at=now(); elsif new.status<>'published' then new.published_at=null; end if;
 elsif tg_table_name='package_itinerary_days' then
   if new.overnight_location_id is distinct from old.overnight_location_id and exists(select 1 from public.package_day_hotels ph join public.hotels h on h.id=ph.hotel_id where ph.itinerary_day_id=new.id and new.overnight_location_id is not null and h.location_id<>new.overnight_location_id) then raise exception 'Remove or change hotel options before changing the overnight location.'; end if;
 elsif tg_table_name='package_price_adjustments' then new.updated_by=coalesce(auth.uid(),old.updated_by); end if;
 return new;
end; $$;

create or replace function public.validate_package_before_publish() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare day_count integer; begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from new.status) then
   if new.featured_image_asset_id is null then raise exception 'Choose a featured image before publishing.'; end if;
   select count(*) into day_count from public.package_itinerary_days where package_id=new.id;
   if day_count<>new.duration_days then raise exception 'Complete all % itinerary days before publishing.',new.duration_days; end if;
   if not exists(select 1 from public.package_vehicle_options where package_id=new.id) then raise exception 'Add at least one vehicle passenger rule before publishing.'; end if;
 end if; return new;
end; $$;

create or replace function public.ensure_package_primary_hotel() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.is_primary then update public.package_day_hotels set is_primary=false where itinerary_day_id=new.itinerary_day_id and hotel_category_id=new.hotel_category_id and id<>new.id and is_primary; end if;
 return new;
end; $$;

create or replace function public.prepare_package_insert() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 new.created_by=coalesce(auth.uid(),new.created_by); new.updated_by=coalesce(auth.uid(),new.updated_by);
 if new.status='published' then new.published_at=coalesce(new.published_at,now()); end if;
 return new;
end; $$;

create or replace function public.enforce_package_status_permission() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if tg_op='UPDATE' and not public.has_permission('packages.update') and
    (to_jsonb(new)-array['status','published_at','updated_at','updated_by']) is distinct from
    (to_jsonb(old)-array['status','published_at','updated_at','updated_by']) then
   raise exception 'Publish permission can only change package publication status.' using errcode='42501';
 end if;
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from new.status) and not public.has_permission('packages.publish') then
   raise exception 'You do not have permission to publish packages.' using errcode='42501';
 end if; return new;
end; $$;

create or replace function public.enforce_package_day_number() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare maximum_days smallint; begin
 select duration_days into maximum_days from public.packages where id=new.package_id;
 if maximum_days is null or new.day_number>maximum_days then raise exception 'Itinerary day must be within the package duration.'; end if; return new;
end; $$;

create or replace function public.enforce_package_activity_variant() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare linked_offering uuid; begin
 if new.activity_variant_id is not null then select activity_offering_id into linked_offering from public.activity_variants where id=new.activity_variant_id;
 if linked_offering is null or linked_offering<>new.activity_offering_id then raise exception 'The selected activity variant does not belong to this offering.'; end if; end if; return new;
end; $$;

create or replace function public.enforce_package_hotel_scope() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare linked_hotel uuid; linked_category uuid; overnight_location uuid; hotel_location uuid; begin
 select overnight_location_id into overnight_location from public.package_itinerary_days where id=new.itinerary_day_id;
 select location_id into hotel_location from public.hotels where id=new.hotel_id;
 if overnight_location is not null and hotel_location<>overnight_location then raise exception 'The hotel must belong to the itinerary overnight location.'; end if;
 if new.hotel_room_id is not null then select hotel_id,category_id into linked_hotel,linked_category from public.hotel_rooms where id=new.hotel_room_id;
 if linked_hotel is null or linked_hotel<>new.hotel_id or linked_category<>new.hotel_category_id then raise exception 'The selected room does not belong to this hotel and category.'; end if; end if; return new;
end; $$;

create or replace function public.enforce_package_vehicle_scope() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare linked_category uuid; linked_location uuid; package_days smallint; begin
 select duration_days into package_days from public.packages where id=new.package_id;
 if new.billable_days>package_days then raise exception 'Billable vehicle days cannot exceed package duration.'; end if;
 if new.vehicle_model_id is not null then select category_id into linked_category from public.vehicle_models where id=new.vehicle_model_id;
 if linked_category is null or linked_category<>new.vehicle_category_id then raise exception 'The selected vehicle model does not belong to this category.'; end if; end if;
 if new.vendor_id is not null then select base_location_id into linked_location from public.transport_vendors where id=new.vendor_id;
 if linked_location is null or linked_location<>new.base_location_id then raise exception 'The selected vendor does not belong to this base location.'; end if; end if; return new;
end; $$;

create or replace function public.save_package_core(
 p_package_id uuid, p_package jsonb, p_gallery_asset_ids uuid[], p_destination_ids uuid[]
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved_id uuid; primary_destination uuid := (p_package->>'primary_destination_id')::uuid;
begin
 if p_package_id is null then
   if not public.has_permission('packages.create') then raise exception 'You do not have permission to create packages.' using errcode='42501'; end if;
   insert into public.packages(primary_destination_id,start_location_id,end_location_id,name,slug,package_code,short_description,description,duration_days,duration_nights,featured_image_asset_id,is_featured,status,seo_title,seo_description)
   values(primary_destination,nullif(p_package->>'start_location_id','')::uuid,nullif(p_package->>'end_location_id','')::uuid,p_package->>'name',p_package->>'slug',nullif(p_package->>'package_code',''),nullif(p_package->>'short_description',''),nullif(p_package->>'description',''),(p_package->>'duration_days')::smallint,(p_package->>'duration_nights')::smallint,nullif(p_package->>'featured_image_asset_id','')::uuid,coalesce((p_package->>'is_featured')::boolean,false),p_package->>'status',nullif(p_package->>'seo_title',''),nullif(p_package->>'seo_description','')) returning id into saved_id;
 else
   if not public.has_permission('packages.update') then raise exception 'You do not have permission to update packages.' using errcode='42501'; end if;
   update public.packages set primary_destination_id=primary_destination,start_location_id=nullif(p_package->>'start_location_id','')::uuid,end_location_id=nullif(p_package->>'end_location_id','')::uuid,name=p_package->>'name',slug=p_package->>'slug',package_code=nullif(p_package->>'package_code',''),short_description=nullif(p_package->>'short_description',''),description=nullif(p_package->>'description',''),duration_days=(p_package->>'duration_days')::smallint,duration_nights=(p_package->>'duration_nights')::smallint,featured_image_asset_id=nullif(p_package->>'featured_image_asset_id','')::uuid,is_featured=coalesce((p_package->>'is_featured')::boolean,false),status=p_package->>'status',seo_title=nullif(p_package->>'seo_title',''),seo_description=nullif(p_package->>'seo_description','') where id=p_package_id returning id into saved_id;
   if saved_id is null then raise exception 'Package was not found.'; end if;
 end if;
 delete from public.package_media where package_id=saved_id;
 insert into public.package_media(package_id,media_asset_id,display_order)
 select saved_id,x.asset_id,(x.ordinality-1)::smallint from unnest(coalesce(p_gallery_asset_ids,array[]::uuid[])) with ordinality x(asset_id,ordinality)
 on conflict(package_id,media_asset_id) do nothing;
 delete from public.package_destinations where package_id=saved_id;
 insert into public.package_destinations(package_id,destination_id,display_order)
 select saved_id,x.destination_id,min((x.ordinality-1)::smallint) from unnest(array_prepend(primary_destination,coalesce(p_destination_ids,array[]::uuid[]))) with ordinality x(destination_id,ordinality)
 group by x.destination_id
 on conflict(package_id,destination_id) do update set display_order=least(public.package_destinations.display_order,excluded.display_order);
 return saved_id;
end; $$;

revoke all on function public.set_package_updated_at() from public,anon,authenticated;
revoke all on function public.prepare_package_insert() from public,anon,authenticated;
revoke all on function public.enforce_package_status_permission() from public,anon,authenticated;
revoke all on function public.enforce_package_day_number() from public,anon,authenticated;
revoke all on function public.enforce_package_activity_variant() from public,anon,authenticated;
revoke all on function public.enforce_package_hotel_scope() from public,anon,authenticated;
revoke all on function public.enforce_package_vehicle_scope() from public,anon,authenticated;
revoke all on function public.validate_package_before_publish() from public,anon,authenticated;
revoke all on function public.ensure_package_primary_hotel() from public,anon,authenticated;
revoke all on function public.save_package_core(uuid,jsonb,uuid[],uuid[]) from public,anon;
grant execute on function public.save_package_core(uuid,jsonb,uuid[],uuid[]) to authenticated;

create trigger packages_prepare before insert on public.packages for each row execute function public.prepare_package_insert();
create trigger packages_updated before update on public.packages for each row execute function public.set_package_updated_at();
create trigger package_days_updated before update on public.package_itinerary_days for each row execute function public.set_package_updated_at();
create trigger package_adjustments_updated before update on public.package_price_adjustments for each row execute function public.set_package_updated_at();
create trigger packages_publish_guard before insert or update on public.packages for each row execute function public.enforce_package_status_permission();
create trigger packages_publish_validation before insert or update on public.packages for each row execute function public.validate_package_before_publish();
create trigger package_days_guard before insert or update on public.package_itinerary_days for each row execute function public.enforce_package_day_number();
create trigger package_activities_guard before insert or update on public.package_day_activities for each row execute function public.enforce_package_activity_variant();
create trigger package_hotels_guard before insert or update on public.package_day_hotels for each row execute function public.enforce_package_hotel_scope();
create trigger package_hotels_primary before insert or update on public.package_day_hotels for each row execute function public.ensure_package_primary_hotel();
create trigger package_vehicles_guard before insert or update on public.package_vehicle_options for each row execute function public.enforce_package_vehicle_scope();

alter table public.packages enable row level security;
alter table public.package_destinations enable row level security; alter table public.package_media enable row level security;
alter table public.package_itinerary_days enable row level security; alter table public.package_day_activities enable row level security;
alter table public.package_day_hotels enable row level security; alter table public.package_vehicle_options enable row level security;
alter table public.package_content_items enable row level security; alter table public.package_faqs enable row level security;
alter table public.package_price_adjustments enable row level security;

create policy packages_select_rbac on public.packages for select to authenticated using(public.has_permission('packages.view')or public.has_permission('packages.update')or public.has_permission('packages.manage_pricing')or public.has_permission('packages.publish'));
create policy packages_select_create_owner on public.packages for select to authenticated using(public.has_permission('packages.create')and created_by=(select auth.uid()));
create policy packages_insert_rbac on public.packages for insert to authenticated with check(public.has_permission('packages.create')and created_by=(select auth.uid()));
create policy packages_update_rbac on public.packages for update to authenticated using(public.has_permission('packages.update')or public.has_permission('packages.publish')) with check(public.has_permission('packages.update')or public.has_permission('packages.publish'));
create policy packages_delete_rbac on public.packages for delete to authenticated using(public.has_permission('packages.delete'));

do $$ declare t text; begin foreach t in array array['package_destinations','package_media','package_itinerary_days','package_day_activities','package_day_hotels','package_vehicle_options','package_content_items','package_faqs'] loop
 execute format('create policy %I on public.%I for select to authenticated using(public.has_permission(''packages.view'')or public.has_permission(''packages.update''))',t||'_select_rbac',t);
 execute format('create policy %I on public.%I for insert to authenticated with check(public.has_permission(''packages.update''))',t||'_insert_rbac',t);
 execute format('create policy %I on public.%I for update to authenticated using(public.has_permission(''packages.update'')) with check(public.has_permission(''packages.update''))',t||'_update_rbac',t);
 execute format('create policy %I on public.%I for delete to authenticated using(public.has_permission(''packages.update'')or public.has_permission(''packages.delete''))',t||'_delete_rbac',t);
end loop; end; $$;

create policy package_destinations_create_owner on public.package_destinations for insert to authenticated with check(
 public.has_permission('packages.create') and exists(select 1 from public.packages p where p.id=package_id and p.created_by=(select auth.uid()))
);
create policy package_media_create_owner on public.package_media for insert to authenticated with check(
 public.has_permission('packages.create') and exists(select 1 from public.packages p where p.id=package_id and p.created_by=(select auth.uid()))
);

create policy destinations_select_package_dependency on public.destinations for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy locations_select_package_dependency on public.locations for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy hotel_categories_select_package_dependency on public.hotel_categories for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')or public.has_permission('packages.manage_pricing')
);
create policy hotels_select_package_dependency on public.hotels for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy hotel_rooms_select_package_dependency on public.hotel_rooms for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy hotel_rates_select_package_dependency on public.hotel_rate_cards for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.update')or public.has_permission('packages.manage_pricing')
);
create policy activity_offerings_select_package_dependency on public.activity_offerings for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy activity_variants_select_package_dependency on public.activity_variants for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy activity_prices_select_package_dependency on public.activity_participant_prices for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.update')or public.has_permission('packages.manage_pricing')
);
create policy activity_charges_select_package_dependency on public.activity_charges for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.update')or public.has_permission('packages.manage_pricing')
);
create policy vehicle_categories_select_package_dependency on public.vehicle_categories for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy vehicle_models_select_package_dependency on public.vehicle_models for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy vehicle_vendors_select_package_dependency on public.transport_vendors for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.create')or public.has_permission('packages.update')
);
create policy vehicle_rates_select_package_dependency on public.vehicle_rate_cards for select to authenticated using(
 public.has_permission('packages.view')or public.has_permission('packages.update')or public.has_permission('packages.manage_pricing')
);

create policy package_adjustments_select_rbac on public.package_price_adjustments for select to authenticated using(public.has_permission('packages.view')or public.has_permission('packages.manage_pricing'));
create policy package_adjustments_insert_rbac on public.package_price_adjustments for insert to authenticated with check(public.has_permission('packages.manage_pricing')and updated_by=(select auth.uid()));
create policy package_adjustments_update_rbac on public.package_price_adjustments for update to authenticated using(public.has_permission('packages.manage_pricing')) with check(public.has_permission('packages.manage_pricing'));
create policy package_adjustments_delete_rbac on public.package_price_adjustments for delete to authenticated using(public.has_permission('packages.manage_pricing'));

create policy packages_public on public.packages for select to anon using(status='published');
create policy package_destinations_public on public.package_destinations for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));
create policy package_media_public on public.package_media for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));
create policy package_days_public on public.package_itinerary_days for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));
create policy package_activities_public on public.package_day_activities for select to anon using(exists(select 1 from public.package_itinerary_days d join public.packages p on p.id=d.package_id where d.id=itinerary_day_id and p.status='published'));
create policy package_hotels_public on public.package_day_hotels for select to anon using(exists(select 1 from public.package_itinerary_days d join public.packages p on p.id=d.package_id where d.id=itinerary_day_id and p.status='published'));
create policy package_vehicles_public on public.package_vehicle_options for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));
create policy package_content_public on public.package_content_items for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));
create policy package_faqs_public on public.package_faqs for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));
create policy package_adjustments_public on public.package_price_adjustments for select to anon using(exists(select 1 from public.packages p where p.id=package_id and p.status='published'));

grant select,insert,update,delete on public.packages,public.package_destinations,public.package_media,public.package_itinerary_days,public.package_day_activities,public.package_day_hotels,public.package_vehicle_options,public.package_content_items,public.package_faqs,public.package_price_adjustments to authenticated;
grant select on public.packages,public.package_destinations,public.package_media,public.package_itinerary_days,public.package_day_activities,public.package_day_hotels,public.package_vehicle_options,public.package_content_items,public.package_faqs,public.package_price_adjustments to anon;

do $$ declare t text; begin foreach t in array array['packages','package_destinations','package_media','package_itinerary_days','package_day_activities','package_day_hotels','package_vehicle_options','package_content_items','package_faqs','package_price_adjustments'] loop
 execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_row_audit()',t||'_audit',t); end loop; end; $$;

commit;
