-- Optional approved final group quote. Catalog/component rates remain unchanged.
-- Revisions already issued retain their immutable document/calculation snapshots.
alter table public.custom_itineraries
  add column total_override_paise bigint,
  add column total_override_reason text not null default '',
  add constraint custom_itinerary_total_override_amount check(total_override_paise is null or total_override_paise between 0 and 1000000000),
  add constraint custom_itinerary_total_override_reason check(length(total_override_reason)<=500 and (total_override_paise is null or length(btrim(total_override_reason))>0));

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
 coalesce(previous.markup_bps,0)<>(p_input->>'markup_bps')::int or coalesce(previous.discount_paise,0)<>(p_input->>'discount_paise')::bigint or previous.total_override_paise is distinct from (p_input->>'total_override_paise')::bigint or coalesce(previous.total_override_reason,'') is distinct from coalesce(p_input->>'total_override_reason','') or old_overrides<>new_overrides
 ) then raise exception 'Quotation pricing permission required.' using errcode='42501'; end if;

 v:=jsonb_populate_record(null::public.custom_itineraries,p_input || jsonb_build_object('travel_date',nullif(p_input->>'travel_date',''),'valid_until',nullif(p_input->>'valid_until','')));
 insert into public.custom_itineraries(id,title,customer_name,customer_email,customer_phone,travel_date,valid_until,adults,children,infants,luggage_count,source_package_id,
 markup_bps,discount_paise,total_override_paise,total_override_reason,advance_paise,show_hotel_cost,show_activity_cost,show_vehicle_cost,public_notes,internal_notes,terms,created_by,updated_by)
 values(target,v.title,v.customer_name,v.customer_email,v.customer_phone,v.travel_date,v.valid_until,v.adults,v.children,v.infants,v.luggage_count,v.source_package_id,
 v.markup_bps,v.discount_paise,v.total_override_paise,coalesce(v.total_override_reason,''),v.advance_paise,v.show_hotel_cost,v.show_activity_cost,v.show_vehicle_cost,v.public_notes,v.internal_notes,v.terms,p_actor,p_actor)
 on conflict(id) do update set title=excluded.title,customer_name=excluded.customer_name,customer_email=excluded.customer_email,customer_phone=excluded.customer_phone,
 travel_date=excluded.travel_date,valid_until=excluded.valid_until,adults=excluded.adults,children=excluded.children,infants=excluded.infants,luggage_count=excluded.luggage_count,
 markup_bps=excluded.markup_bps,discount_paise=excluded.discount_paise,total_override_paise=excluded.total_override_paise,total_override_reason=excluded.total_override_reason,advance_paise=excluded.advance_paise,show_hotel_cost=excluded.show_hotel_cost,show_activity_cost=excluded.show_activity_cost,
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

-- Preserve the service-only mutation boundary; authenticated clients use server actions.
revoke all on function public.save_custom_itinerary(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_custom_itinerary(uuid,jsonb) to service_role;

