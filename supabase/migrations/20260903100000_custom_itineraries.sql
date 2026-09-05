-- Custom quotations are private operational data, not website packages.
-- Apply with the existing migrations. Never expose the service-role key to a browser.
create table public.custom_itineraries (
 id uuid primary key default gen_random_uuid(),
 quote_number bigint generated always as identity unique,
 title text not null check(char_length(title) between 3 and 200),
 customer_name text not null check(char_length(customer_name) between 2 and 150),
 customer_email text not null default '', customer_phone text not null default '',
 travel_date date, valid_until date,
 adults integer not null check(adults between 1 and 100), children integer not null default 0 check(children between 0 and 100),
 infants integer not null default 0 check(infants between 0 and 100), luggage_count integer not null default 0 check(luggage_count between 0 and 100),
 source_package_id uuid references public.packages(id) on delete set null,
 markup_bps integer not null default 0 check(markup_bps between 0 and 100000),
 discount_paise bigint not null default 0 check(discount_paise between 0 and 1000000000),
 advance_paise bigint not null default 0 check(advance_paise between 0 and 1000000000),
 show_hotel_cost boolean not null default false, show_activity_cost boolean not null default false, show_vehicle_cost boolean not null default true,
 public_notes text not null default '', internal_notes text not null default '', terms text not null default '',
 status text not null default 'draft' check(status in('draft','quoted','sent','accepted','rejected','expired')),
 version integer not null default 1 check(version>0), current_revision integer not null default 0,
 created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_document tsvector generated always as (to_tsvector('simple', title || ' ' || customer_name || ' ' || customer_phone)) stored,
 check(adults+children+infants<=100)
);
create table public.custom_itinerary_days (
 id uuid primary key, itinerary_id uuid not null references public.custom_itineraries(id) on delete cascade,
 day_number integer not null check(day_number between 1 and 60),
 title text not null, description text not null default '',
 start_location_id uuid references public.locations(id), end_location_id uuid references public.locations(id),
 overnight_location_id uuid references public.locations(id),
 distance_km numeric check(distance_km between 0 and 5000), travel_minutes integer check(travel_minutes between 0 and 1440),
 breakfast boolean not null, lunch boolean not null, dinner boolean not null,
 unique(itinerary_id,day_number)
);
create table public.custom_itinerary_stays (
 id uuid primary key, day_id uuid not null references public.custom_itinerary_days(id) on delete cascade,
 hotel_id uuid not null references public.hotels(id), room_id uuid references public.hotel_rooms(id),
 category_id uuid not null references public.hotel_categories(id), meal_plan text not null check(meal_plan in('EP','CP','MAP','AP')),
 adults integer not null check(adults between 1 and 100),
 children_with_bed integer not null check(children_with_bed between 0 and 100),
 children_without_bed integer not null check(children_without_bed between 0 and 100),
 infants integer not null check(infants between 0 and 100), rooms integer not null check(rooms between 1 and 100),
 extra_adult_beds integer not null check(extra_adult_beds between 0 and 100),
 override_total_paise bigint check(override_total_paise between 0 and 1000000000), override_reason text not null default '',
 check(override_total_paise is null or length(trim(override_reason))>0)
);
create table public.custom_itinerary_activities (
 id uuid primary key, day_id uuid not null references public.custom_itinerary_days(id) on delete cascade,
 offering_id uuid not null references public.activity_offerings(id), variant_id uuid references public.activity_variants(id),
 adults integer not null check(adults between 0 and 100), children integer not null check(children between 0 and 100),
 infants integer not null check(infants between 0 and 100), quantity integer not null check(quantity between 1 and 20),
 units integer check(units between 1 and 100), optional boolean not null default false,
 override_total_paise bigint check(override_total_paise between 0 and 1000000000), override_reason text not null default '',
 check(adults+children+infants between 1 and 100), check(override_total_paise is null or length(trim(override_reason))>0)
);
create table public.custom_itinerary_activity_charges (
 activity_id uuid not null references public.custom_itinerary_activities(id) on delete cascade,
 charge_id uuid not null references public.activity_charges(id), primary key(activity_id,charge_id)
);
create table public.custom_itinerary_transport (
 id uuid primary key, itinerary_id uuid not null references public.custom_itineraries(id) on delete cascade,
 start_day integer not null check(start_day between 1 and 60), end_day integer not null check(end_day between start_day and 60),
 base_location_id uuid not null references public.locations(id), category_id uuid not null references public.vehicle_categories(id),
 model_id uuid references public.vehicle_models(id), vendor_id uuid references public.transport_vendors(id),
 fleet_id uuid references public.fleet_vehicles(id), driver_id uuid references public.drivers(id),
 quantity integer not null check(quantity between 1 and 20), luggage_only boolean not null default false,
 override_total_paise bigint check(override_total_paise between 0 and 1000000000), override_reason text not null default '',
 check((fleet_id is null and driver_id is null) or quantity=1), check(override_total_paise is null or length(trim(override_reason))>0)
);
create table public.custom_itinerary_revisions (
 id uuid primary key default gen_random_uuid(), itinerary_id uuid not null references public.custom_itineraries(id),
 revision integer not null check(revision>0), document jsonb not null check(jsonb_typeof(document)='object'),
 calculation jsonb not null check(jsonb_typeof(calculation)='object'),
 -- Immutable source snapshot allows later booking conversion without joining mutable catalogs.
 source_snapshot jsonb not null check(jsonb_typeof(source_snapshot)='object'),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(itinerary_id,revision)
);
create table public.custom_itinerary_events (
 id bigint generated always as identity primary key,
 itinerary_id uuid not null references public.custom_itineraries(id) on delete cascade,
 actor_id uuid not null references auth.users(id), action text not null, version integer not null,
 created_at timestamptz not null default now()
);
create index custom_itineraries_status_created_idx on public.custom_itineraries(status,created_at desc);
create index custom_itineraries_search_idx on public.custom_itineraries using gin(search_document);
create index custom_itineraries_created_idx on public.custom_itineraries(created_at desc,id);
create index custom_itineraries_creator_idx on public.custom_itineraries(created_by);
create index custom_itineraries_source_idx on public.custom_itineraries(source_package_id);
create index custom_itinerary_stays_day_idx on public.custom_itinerary_stays(day_id);
create index custom_itinerary_activities_day_idx on public.custom_itinerary_activities(day_id);
create index custom_itinerary_transport_parent_idx on public.custom_itinerary_transport(itinerary_id);
create index custom_itinerary_events_parent_idx on public.custom_itinerary_events(itinerary_id,created_at desc);
-- FK indexes keep catalog deletes/updates from scanning entire child tables.
do $$
declare t text; c text;
begin
 for t,c in select * from (values
 ('custom_itinerary_days','start_location_id'),('custom_itinerary_days','end_location_id'),('custom_itinerary_days','overnight_location_id'),
 ('custom_itinerary_stays','hotel_id'),('custom_itinerary_stays','room_id'),('custom_itinerary_stays','category_id'),
 ('custom_itinerary_activities','offering_id'),('custom_itinerary_activities','variant_id'),('custom_itinerary_activity_charges','charge_id'),
 ('custom_itinerary_transport','base_location_id'),('custom_itinerary_transport','category_id'),('custom_itinerary_transport','model_id'),
 ('custom_itinerary_transport','vendor_id'),('custom_itinerary_transport','fleet_id'),('custom_itinerary_transport','driver_id')
 ) v(t,c) loop
 execute format('create index %I on public.%I(%I)',t||'_'||c||'_idx',t,c);
 end loop;
end $$;

insert into public.permissions(module,action,permission_key,description)
select 'custom_itineraries',action,'custom_itineraries.'||action,description from (values
 ('view','View private customer itineraries and quotations'),
 ('create','Create custom itineraries and clone packages'),
 ('update','Edit draft itineraries and open new quote revisions'),
 ('delete','Delete drafts that have never been finalized'),
 ('manage_pricing','Change quotation markup, discounts and price overrides'),
 ('finalize','Finalize quotations and record customer acceptance/status'),
 ('export','Download customer quotation PDFs')
) p(action,description) on conflict(permission_key) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.slug in('super_admin','super-admin') and p.module='custom_itineraries'
on conflict do nothing;

create or replace function public.custom_itinerary_actor_can(p_actor uuid,p_permission text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles profile
 join public.role_permissions rp on rp.role_id=profile.role_id
 join public.permissions p on p.id=rp.permission_id
 where profile.id=p_actor and profile.status='active' and not coalesce(profile.must_change_password,false) and p.permission_key=p_permission)
$$;
revoke all on function public.custom_itinerary_actor_can(uuid,text) from public,anon,authenticated;
grant execute on function public.custom_itinerary_actor_can(uuid,text) to service_role;

-- No caller-supplied actor is accepted by the browser-facing read predicate.
create or replace function public.custom_itinerary_can_read()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.custom_itinerary_actor_can(auth.uid(),'custom_itineraries.view')
$$;
revoke all on function public.custom_itinerary_can_read() from public,anon;
grant execute on function public.custom_itinerary_can_read() to authenticated;

-- Every browser role is read-only. All writes use server-only RPCs after active-user/RBAC checks.
do $$
declare t text;
begin
 foreach t in array array['custom_itineraries','custom_itinerary_days','custom_itinerary_stays','custom_itinerary_activities',
 'custom_itinerary_activity_charges','custom_itinerary_transport','custom_itinerary_revisions','custom_itinerary_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy %I on public.%I for select to authenticated using((select public.custom_itinerary_can_read()))',t||'_read',t);
 end loop;
end $$;
grant usage,select on sequence public.custom_itineraries_quote_number_seq,public.custom_itinerary_events_id_seq to service_role;

create or replace function public.custom_itinerary_snapshot_immutable()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'Quotation revisions are immutable. Create a new revision.' using errcode='42501'; end $$;
create trigger custom_itinerary_revision_immutable before update or delete on public.custom_itinerary_revisions
for each row execute function public.custom_itinerary_snapshot_immutable();

create or replace function public.save_custom_itinerary(p_actor uuid,p_input jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.custom_itineraries%rowtype; previous public.custom_itineraries%rowtype;
 d jsonb; s jsonb; a jsonb; t jsonb; target uuid := (p_input->>'id')::uuid; day_id uuid; old_overrides jsonb; new_overrides jsonb;
begin
 if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.view') then raise exception 'Itinerary view permission required.' using errcode='42501'; end if;
 -- Serialize concurrent creation of the same client-generated UUID as well as updates.
 perform pg_advisory_xact_lock(hashtextextended(target::text,0));
 select * into previous from public.custom_itineraries where id=target for update;
 if found then
   if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.update') then raise exception 'Itinerary update permission required.' using errcode='42501'; end if;
   if previous.status<>'draft' then raise exception 'This quotation is locked. Start a new revision.' using errcode='42501'; end if;
   if previous.version<>(p_input->>'version')::int then raise exception 'This itinerary changed in another session. Reload before saving.' using errcode='40001'; end if;
 else
   if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.create') then raise exception 'Itinerary create permission required.' using errcode='42501'; end if;
   if (p_input->>'version')::int<>0 then raise exception 'Itinerary no longer exists.'; end if;
 end if;
 if jsonb_array_length(p_input->'days')>60 or jsonb_array_length(p_input->'transport')>60 then raise exception 'Itinerary size exceeds limits.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'amount',override_total_paise,'reason',override_reason) order by id),'[]'::jsonb) into old_overrides
 from (
 select s.id,s.override_total_paise,s.override_reason from public.custom_itinerary_stays s join public.custom_itinerary_days d on d.id=s.day_id where d.itinerary_id=target
 union all select a.id,a.override_total_paise,a.override_reason from public.custom_itinerary_activities a join public.custom_itinerary_days d on d.id=a.day_id where d.itinerary_id=target
 union all select id,override_total_paise,override_reason from public.custom_itinerary_transport where itinerary_id=target
 ) x where override_total_paise is not null;
 select coalesce(jsonb_agg(jsonb_build_object('id',(item->>'id')::uuid,'amount',(item->>'override_total_paise')::bigint,'reason',item->>'override_reason') order by (item->>'id')::uuid),'[]'::jsonb) into new_overrides from (
 select stay_item.value as item from jsonb_array_elements(p_input->'days') day_item cross join lateral jsonb_array_elements(day_item.value->'stays') stay_item
 union all select activity_item.value from jsonb_array_elements(p_input->'days') day_item cross join lateral jsonb_array_elements(day_item.value->'activities') activity_item
 union all select transport_item.value from jsonb_array_elements(p_input->'transport') transport_item
 ) x where item->>'override_total_paise' is not null;
 if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.manage_pricing') and (
 coalesce(previous.markup_bps,0)<>(p_input->>'markup_bps')::int or coalesce(previous.discount_paise,0)<>(p_input->>'discount_paise')::bigint or old_overrides<>new_overrides
 ) then raise exception 'Quotation pricing permission required.' using errcode='42501'; end if;

 v:=jsonb_populate_record(null::public.custom_itineraries,p_input || jsonb_build_object('travel_date',nullif(p_input->>'travel_date',''),'valid_until',nullif(p_input->>'valid_until','')));
 insert into public.custom_itineraries(id,title,customer_name,customer_email,customer_phone,travel_date,valid_until,adults,children,infants,luggage_count,source_package_id,
 markup_bps,discount_paise,advance_paise,show_hotel_cost,show_activity_cost,show_vehicle_cost,public_notes,internal_notes,terms,created_by,updated_by)
 values(target,v.title,v.customer_name,v.customer_email,v.customer_phone,v.travel_date,v.valid_until,v.adults,v.children,v.infants,v.luggage_count,v.source_package_id,
 v.markup_bps,v.discount_paise,v.advance_paise,v.show_hotel_cost,v.show_activity_cost,v.show_vehicle_cost,v.public_notes,v.internal_notes,v.terms,p_actor,p_actor)
 on conflict(id) do update set title=excluded.title,customer_name=excluded.customer_name,customer_email=excluded.customer_email,customer_phone=excluded.customer_phone,
 travel_date=excluded.travel_date,valid_until=excluded.valid_until,adults=excluded.adults,children=excluded.children,infants=excluded.infants,luggage_count=excluded.luggage_count,
 markup_bps=excluded.markup_bps,discount_paise=excluded.discount_paise,advance_paise=excluded.advance_paise,show_hotel_cost=excluded.show_hotel_cost,show_activity_cost=excluded.show_activity_cost,
 show_vehicle_cost=excluded.show_vehicle_cost,public_notes=excluded.public_notes,internal_notes=excluded.internal_notes,terms=excluded.terms,
 version=custom_itineraries.version+1,updated_by=p_actor,updated_at=now();
 delete from public.custom_itinerary_days where itinerary_id=target;
 delete from public.custom_itinerary_transport where itinerary_id=target;
 for d in select * from jsonb_array_elements(p_input->'days') loop
   day_id:=(d->>'id')::uuid;
   insert into public.custom_itinerary_days select (jsonb_populate_record(null::public.custom_itinerary_days,d||jsonb_build_object('itinerary_id',target))).*;
   for s in select * from jsonb_array_elements(d->'stays') loop
     if not exists(select 1 from public.hotels h join public.locations l on l.id=h.location_id
       join public.locations overnight on overnight.id=(d->>'overnight_location_id')::uuid where h.id=(s->>'hotel_id')::uuid and l.destination_id=overnight.destination_id) then raise exception 'Hotel/overnight destination mismatch.'; end if;
     if s->>'room_id' is not null and not exists(select 1 from public.hotel_rooms r where r.id=(s->>'room_id')::uuid and r.hotel_id=(s->>'hotel_id')::uuid and r.category_id=(s->>'category_id')::uuid) then raise exception 'Hotel room/category mismatch.'; end if;
     insert into public.custom_itinerary_stays select (jsonb_populate_record(null::public.custom_itinerary_stays,s||jsonb_build_object('day_id',day_id))).*;
   end loop;
   for a in select * from jsonb_array_elements(d->'activities') loop
     if exists(select 1 from jsonb_array_elements_text(a->'optional_charge_ids') c
       where not exists(select 1 from public.activity_charges ac where ac.id=c.value::uuid
       and ac.activity_offering_id=(a->>'offering_id')::uuid
       and (ac.activity_variant_id is null or ac.activity_variant_id=(a->>'variant_id')::uuid)))
       then raise exception 'Activity charge/offering mismatch.'; end if;
     if a->>'variant_id' is not null and not exists(select 1 from public.activity_variants av where av.id=(a->>'variant_id')::uuid and av.activity_offering_id=(a->>'offering_id')::uuid) then raise exception 'Activity variant/offering mismatch.'; end if;
     insert into public.custom_itinerary_activities select (jsonb_populate_record(null::public.custom_itinerary_activities,a||jsonb_build_object('day_id',day_id))).*;
     insert into public.custom_itinerary_activity_charges(activity_id,charge_id)
       select (a->>'id')::uuid,c.value::uuid from jsonb_array_elements_text(a->'optional_charge_ids') c
       on conflict do nothing;
   end loop;
 end loop;
 for t in select * from jsonb_array_elements(p_input->'transport') loop
   if t->>'vendor_id' is not null and not exists(select 1 from public.transport_vendors vendor_row where vendor_row.id=(t->>'vendor_id')::uuid and vendor_row.base_location_id=(t->>'base_location_id')::uuid) then raise exception 'Vehicle vendor/base mismatch.'; end if;
   if t->>'fleet_id' is not null and not exists(select 1 from public.fleet_vehicles f where f.id=(t->>'fleet_id')::uuid and f.model_id=(t->>'model_id')::uuid and f.vendor_id=(t->>'vendor_id')::uuid) then raise exception 'Fleet/model/vendor mismatch.'; end if;
   if t->>'driver_id' is not null and not exists(select 1 from public.drivers dr where dr.id=(t->>'driver_id')::uuid and dr.vendor_id=(t->>'vendor_id')::uuid) then raise exception 'Driver/vendor mismatch.'; end if;
   if (t->>'end_day')::int>jsonb_array_length(p_input->'days') then raise exception 'Vehicle days exceed itinerary duration.'; end if;
   if t->>'model_id' is not null and not exists(select 1 from public.vehicle_models m where m.id=(t->>'model_id')::uuid and m.category_id=(t->>'category_id')::uuid) then raise exception 'Vehicle model/category mismatch.'; end if;
   insert into public.custom_itinerary_transport select (jsonb_populate_record(null::public.custom_itinerary_transport,t||jsonb_build_object('itinerary_id',target))).*;
 end loop;
 insert into public.custom_itinerary_events(itinerary_id,actor_id,action,version)
 select target,p_actor,case when previous.id is null then 'created' else 'draft_saved' end,version from public.custom_itineraries where id=target;
 return target;
end $$;

create or replace function public.finalize_custom_itinerary(p_actor uuid,p_id uuid,p_version integer,p_document jsonb,p_calculation jsonb,p_source jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.custom_itineraries%rowtype; revision_number integer;
begin
 if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.view') or not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.finalize') then raise exception 'Quotation finalize permission required.' using errcode='42501'; end if;
 select * into q from public.custom_itineraries where id=p_id for update;
 if not found then raise exception 'Itinerary not found.'; end if;
 if q.status<>'draft' or q.version<>p_version then raise exception 'Quotation changed or is already locked. Reload before finalizing.' using errcode='40001'; end if;
 if jsonb_array_length(p_calculation->'warnings')<>0 then raise exception 'Resolve pricing warnings before finalizing.'; end if;
 if q.travel_date is null or q.valid_until is null or jsonb_array_length(p_document->'days')=0 then raise exception 'Travel dates, validity and itinerary days are required.'; end if;
 revision_number:=q.current_revision+1;
 insert into public.custom_itinerary_revisions(itinerary_id,revision,document,calculation,source_snapshot,created_by)
 values(p_id,revision_number,p_document||jsonb_build_object('revision',revision_number),p_calculation,p_source,p_actor);
 update public.custom_itineraries set status='quoted',current_revision=revision_number,version=version+1,updated_by=p_actor,updated_at=now() where id=p_id;
 insert into public.custom_itinerary_events(itinerary_id,actor_id,action,version) values(p_id,p_actor,'finalized',q.version+1);
 return revision_number;
end $$;

create or replace function public.transition_custom_itinerary(p_actor uuid,p_id uuid,p_version integer,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.custom_itineraries%rowtype;
begin
 if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.view') or not public.custom_itinerary_actor_can(p_actor,case when p_status='draft' then 'custom_itineraries.update' else 'custom_itineraries.finalize' end) then raise exception 'Quotation permission required.' using errcode='42501'; end if;
 select * into q from public.custom_itineraries where id=p_id for update;
 if not found then raise exception 'Itinerary not found.'; end if;
 if q.version<>p_version then raise exception 'Quotation changed. Reload before continuing.' using errcode='40001'; end if;
 if not ((p_status='draft' and q.status in('quoted','sent','rejected','expired')) or
 (p_status='sent' and q.status='quoted') or
 (p_status in('accepted','rejected','expired') and q.status in('quoted','sent'))) then raise exception 'This quotation status transition is not allowed.'; end if;
 if p_status='accepted' and q.valid_until::date<current_date then raise exception 'This quotation has expired. Create a new revision.'; end if;
 update public.custom_itineraries set status=p_status,version=version+1,updated_by=p_actor,updated_at=now() where id=p_id;
 insert into public.custom_itinerary_events(itinerary_id,actor_id,action,version) values(p_id,p_actor,p_status,q.version+1);
end $$;

create or replace function public.delete_custom_itinerary(p_actor uuid,p_id uuid,p_version integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.custom_itineraries%rowtype;
begin
 if not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.view') or not public.custom_itinerary_actor_can(p_actor,'custom_itineraries.delete') then raise exception 'Itinerary delete permission required.' using errcode='42501'; end if;
 select * into q from public.custom_itineraries where id=p_id for update;
 if not found then raise exception 'Itinerary not found.'; end if;
 if q.version<>p_version or q.status<>'draft' or q.current_revision<>0 then raise exception 'Only unchanged, never-finalized drafts can be deleted.'; end if;
 delete from public.custom_itineraries where id=p_id;
end $$;
revoke all on function public.save_custom_itinerary(uuid,jsonb),public.finalize_custom_itinerary(uuid,uuid,integer,jsonb,jsonb,jsonb),
 public.transition_custom_itinerary(uuid,uuid,integer,text),public.delete_custom_itinerary(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.save_custom_itinerary(uuid,jsonb),public.finalize_custom_itinerary(uuid,uuid,integer,jsonb,jsonb,jsonb),
 public.transition_custom_itinerary(uuid,uuid,integer,text),public.delete_custom_itinerary(uuid,uuid,integer) to service_role;
