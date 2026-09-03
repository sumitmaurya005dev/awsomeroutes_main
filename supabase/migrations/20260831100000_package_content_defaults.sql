begin;

insert into public.permissions (module, action, permission_key, description)
values ('packages','manage_defaults','packages.manage_defaults','Manage reusable package content templates and policies')
on conflict (permission_key) do update
set module=excluded.module, action=excluded.action, description=excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.slug='super_admin' and permission.permission_key='packages.manage_defaults'
on conflict do nothing;

create table public.package_content_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 3 and 120),
  slug text not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  version integer not null default 1 check(version between 1 and 10000),
  status text not null default 'draft' check(status in ('draft','active','archived')),
  is_default boolean not null default false,
  notes text check(notes is null or char_length(notes)<=2000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_content_templates_default_active_check check(not is_default or status='active'),
  unique(slug,version)
);

create unique index package_content_templates_one_default_idx
on public.package_content_templates(is_default) where is_default;
create index package_content_templates_status_idx
on public.package_content_templates(status,updated_at desc);

create table public.package_content_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.package_content_templates(id) on delete cascade,
  section_type text not null check(section_type in(
    'highlight','inclusion','exclusion','important_note','terms','cancellation','reschedule','value_promise'
  )),
  title text not null check(char_length(title) between 2 and 160),
  display_order smallint not null default 0 check(display_order between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id,section_type,title)
);
create index package_template_sections_order_idx
on public.package_content_template_sections(template_id,display_order,id);

create table public.package_content_template_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.package_content_template_sections(id) on delete cascade,
  content text not null check(char_length(content) between 1 and 3000),
  display_order smallint not null default 0 check(display_order between 0 and 500),
  status text not null default 'active' check(status in('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index package_template_items_order_idx
on public.package_content_template_items(section_id,status,display_order,id);

alter table public.packages
  add column content_template_id uuid references public.package_content_templates(id) on delete set null,
  add column content_template_version integer,
  add column content_synced_at timestamptz;

-- The existing publication guard allows publish-only roles to change only
-- publication fields. Content snapshot metadata is additionally allowed only
-- while the trusted sync function has enabled its transaction-local context.
create or replace function public.enforce_package_status_permission()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  allowed_columns text[]:=array['status','published_at','updated_at','updated_by'];
begin
  if current_setting('app.package_content_sync',true)='1' then
    allowed_columns=allowed_columns||array['content_template_id','content_template_version','content_synced_at'];
  end if;
  if tg_op='UPDATE' and not public.has_permission('packages.update') and
     (to_jsonb(new)-allowed_columns) is distinct from (to_jsonb(old)-allowed_columns) then
    raise exception 'Publish permission can only change package publication status.' using errcode='42501';
  end if;
  if new.status='published' and (tg_op='INSERT' or old.status is distinct from new.status)
     and not public.has_permission('packages.publish') then
    raise exception 'You do not have permission to publish packages.' using errcode='42501';
  end if;
  return new;
end;
$$;

alter table public.package_content_items
  drop constraint if exists package_content_items_item_type_check,
  drop constraint if exists package_content_items_content_check,
  drop constraint if exists package_content_items_display_order_check;
alter table public.package_content_items
  add constraint package_content_items_item_type_check check(item_type in(
    'highlight','inclusion','exclusion','important_note','terms','cancellation','reschedule','value_promise'
  )),
  add constraint package_content_items_content_check check(char_length(content) between 1 and 3000),
  add constraint package_content_items_display_order_check check(display_order between 0 and 10000),
  add column section_title text not null default 'General' check(char_length(section_title) between 2 and 160),
  add column source_template_item_id uuid references public.package_content_template_items(id) on delete set null,
  add column system_key text check(system_key is null or system_key ~ '^[a-z0-9]+(?:[:_-][a-z0-9]+)*$'),
  add column is_system_generated boolean not null default false,
  add column is_customized boolean not null default false,
  add column updated_at timestamptz not null default now();

create unique index package_content_template_snapshot_uidx
on public.package_content_items(package_id,source_template_item_id)
where source_template_item_id is not null;
create unique index package_content_system_key_uidx
on public.package_content_items(package_id,system_key)
where system_key is not null;
create index packages_content_template_idx
on public.packages(content_template_id) where content_template_id is not null;

create or replace function public.touch_package_content_template()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  new.updated_at=now();
  if tg_table_name='package_content_templates' then
    new.updated_by=coalesce(auth.uid(),old.updated_by);
  end if;
  return new;
end;
$$;

create trigger package_content_templates_updated
before update on public.package_content_templates
for each row execute function public.touch_package_content_template();
create trigger package_content_template_sections_updated
before update on public.package_content_template_sections
for each row execute function public.touch_package_content_template();
create trigger package_content_template_items_updated
before update on public.package_content_template_items
for each row execute function public.touch_package_content_template();
create trigger package_content_items_updated
before update on public.package_content_items
for each row execute function public.touch_package_content_template();

create or replace function public.set_default_package_content_template(p_template_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.has_permission('packages.manage_defaults') then
    raise exception 'Missing required permission: packages.manage_defaults' using errcode='42501';
  end if;
  if not exists(select 1 from public.package_content_templates where id=p_template_id) then
    raise exception 'Package content template was not found.';
  end if;
  update public.package_content_templates set is_default=false where is_default and id<>p_template_id;
  update public.package_content_templates set is_default=true,status='active' where id=p_template_id;
end;
$$;

create or replace function public.sync_package_content_defaults(
  p_package_id uuid,
  p_replace boolean default false
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  package_row public.packages%rowtype;
  template_row public.package_content_templates%rowtype;
  inserted_count integer:=0;
begin
  select * into package_row from public.packages where id=p_package_id;
  if package_row.id is null then raise exception 'Package was not found.'; end if;
  if not public.has_permission('packages.update') and not (
    public.has_permission('packages.create') and package_row.created_by=auth.uid()
  ) then
    raise exception 'You do not have permission to sync package content.' using errcode='42501';
  end if;
  if package_row.status not in('draft','inactive') then
    raise exception 'Default content can be synced only to draft or inactive packages.';
  end if;
  select * into template_row from public.package_content_templates
  where is_default and status='active' order by updated_at desc limit 1;
  if template_row.id is null then return 0; end if;

  if p_replace then
    delete from public.package_content_items
    where package_id=p_package_id
      and source_template_item_id is not null
      and not is_customized;
  end if;

  insert into public.package_content_items(
    package_id,item_type,section_title,content,display_order,
    source_template_item_id,is_system_generated,is_customized
  )
  select p_package_id,section.section_type,section.title,item.content,
    (section.display_order*10+item.display_order)::smallint,
    item.id,false,false
  from public.package_content_template_sections section
  join public.package_content_template_items item on item.section_id=section.id
  where section.template_id=template_row.id and item.status='active'
  on conflict(package_id,source_template_item_id)
    where source_template_item_id is not null do nothing;
  get diagnostics inserted_count=row_count;

  perform set_config('app.package_content_sync','1',true);
  update public.packages set
    content_template_id=template_row.id,
    content_template_version=template_row.version,
    content_synced_at=now()
  where id=p_package_id;
  perform set_config('app.package_content_sync','0',true);
  return inserted_count;
end;
$$;

create or replace function public.rebuild_package_generated_content(p_package_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.packages where id=p_package_id) then return; end if;

  delete from public.package_content_items
  where package_id=p_package_id and is_system_generated and not is_customized;

  if exists(select 1 from public.package_itinerary_days where package_id=p_package_id and overnight_location_id is not null) then
    insert into public.package_content_items(package_id,item_type,section_title,content,display_order,system_key,is_system_generated)
    values(p_package_id,'inclusion','Tour Inclusions','Accommodation in selected hotels or resorts as specified in the itinerary.',1,'accommodation',true)
    on conflict(package_id,system_key) where system_key is not null do nothing;
  end if;
  if exists(select 1 from public.package_itinerary_days where package_id=p_package_id and breakfast_included) then
    insert into public.package_content_items(package_id,item_type,section_title,content,display_order,system_key,is_system_generated)
    values(p_package_id,'inclusion','Tour Inclusions','Breakfast on the itinerary days where it is specifically marked as included.',2,'breakfast',true)
    on conflict(package_id,system_key) where system_key is not null do nothing;
  end if;
  if exists(select 1 from public.package_itinerary_days where package_id=p_package_id and lunch_included) then
    insert into public.package_content_items(package_id,item_type,section_title,content,display_order,system_key,is_system_generated)
    values(p_package_id,'inclusion','Tour Inclusions','Lunch on the itinerary days where it is specifically marked as included.',3,'lunch',true)
    on conflict(package_id,system_key) where system_key is not null do nothing;
  end if;
  if exists(select 1 from public.package_itinerary_days where package_id=p_package_id and dinner_included) then
    insert into public.package_content_items(package_id,item_type,section_title,content,display_order,system_key,is_system_generated)
    values(p_package_id,'inclusion','Tour Inclusions','Dinner on the itinerary days where it is specifically marked as included.',4,'dinner',true)
    on conflict(package_id,system_key) where system_key is not null do nothing;
  end if;
  if exists(select 1 from public.package_vehicle_options where package_id=p_package_id) then
    insert into public.package_content_items(package_id,item_type,section_title,content,display_order,system_key,is_system_generated)
    values(p_package_id,'inclusion','Tour Inclusions','Private vehicle services as configured for the itinerary, including driver allowance, fuel, toll and parking where covered by the selected rate.',5,'vehicle',true)
    on conflict(package_id,system_key) where system_key is not null do nothing;
  end if;

  insert into public.package_content_items(
    package_id,item_type,section_title,content,display_order,system_key,is_system_generated
  )
  select p_package_id,'inclusion','Tour Inclusions',
    activity.name||coalesce(' - '||variant.name,'')||
      case when sum(selection.quantity)>1 then ' ('||sum(selection.quantity)::text||' scheduled services)' else '' end||
      ', including mandatory charges configured for the selected activity.',
    (100+row_number() over(order by min(day.day_number),activity.name))::smallint,
    'activity:'||selection.activity_offering_id::text||':'||coalesce(selection.activity_variant_id::text,'base'),true
  from public.package_day_activities selection
  join public.package_itinerary_days day on day.id=selection.itinerary_day_id
  join public.activity_offerings offering on offering.id=selection.activity_offering_id
  join public.activities activity on activity.id=offering.activity_id
  left join public.activity_variants variant on variant.id=selection.activity_variant_id
  where day.package_id=p_package_id and not selection.is_optional
  group by selection.activity_offering_id,selection.activity_variant_id,activity.name,variant.name
  on conflict(package_id,system_key) where system_key is not null do nothing;
end;
$$;

create or replace function public.refresh_package_generated_content_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare package_key uuid;
begin
  if tg_table_name='package_itinerary_days' then
    package_key=case when tg_op='DELETE' then old.package_id else new.package_id end;
  elsif tg_table_name='package_vehicle_options' then
    package_key=case when tg_op='DELETE' then old.package_id else new.package_id end;
  elsif tg_table_name='package_day_activities' then
    select package_id into package_key from public.package_itinerary_days
    where id=case when tg_op='DELETE' then old.itinerary_day_id else new.itinerary_day_id end;
  end if;
  if package_key is not null then perform public.rebuild_package_generated_content(package_key); end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create trigger package_days_refresh_generated_content
after insert or update or delete on public.package_itinerary_days
for each row execute function public.refresh_package_generated_content_trigger();
create trigger package_activities_refresh_generated_content
after insert or update or delete on public.package_day_activities
for each row execute function public.refresh_package_generated_content_trigger();
create trigger package_vehicles_refresh_generated_content
after insert or update or delete on public.package_vehicle_options
for each row execute function public.refresh_package_generated_content_trigger();

create or replace function public.save_package_core_with_defaults(
  p_package_id uuid,
  p_package jsonb,
  p_gallery_asset_ids uuid[],
  p_destination_ids uuid[],
  p_apply_content_defaults boolean default true
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved_id uuid;
begin
  saved_id=public.save_package_core(p_package_id,p_package,p_gallery_asset_ids,p_destination_ids);
  if p_package_id is null and p_apply_content_defaults then
    perform public.sync_package_content_defaults(saved_id,false);
  end if;
  return saved_id;
end;
$$;

revoke all on function public.touch_package_content_template() from public,anon,authenticated;
revoke all on function public.rebuild_package_generated_content(uuid) from public,anon,authenticated;
revoke all on function public.refresh_package_generated_content_trigger() from public,anon,authenticated;
revoke all on function public.set_default_package_content_template(uuid) from public,anon;
revoke all on function public.sync_package_content_defaults(uuid,boolean) from public,anon;
revoke all on function public.save_package_core_with_defaults(uuid,jsonb,uuid[],uuid[],boolean) from public,anon;
grant execute on function public.set_default_package_content_template(uuid) to authenticated;
grant execute on function public.sync_package_content_defaults(uuid,boolean) to authenticated;
grant execute on function public.save_package_core_with_defaults(uuid,jsonb,uuid[],uuid[],boolean) to authenticated;

alter table public.package_content_templates enable row level security;
alter table public.package_content_template_sections enable row level security;
alter table public.package_content_template_items enable row level security;

create policy package_content_templates_select_rbac on public.package_content_templates for select to authenticated using(
  public.has_permission('packages.view') or public.has_permission('packages.create') or
  public.has_permission('packages.update') or public.has_permission('packages.manage_defaults')
);
create policy package_content_templates_write_rbac on public.package_content_templates for all to authenticated
using(public.has_permission('packages.manage_defaults'))
with check(public.has_permission('packages.manage_defaults'));
create policy package_content_sections_select_rbac on public.package_content_template_sections for select to authenticated using(
  public.has_permission('packages.view') or public.has_permission('packages.create') or
  public.has_permission('packages.update') or public.has_permission('packages.manage_defaults')
);
create policy package_content_sections_write_rbac on public.package_content_template_sections for all to authenticated
using(public.has_permission('packages.manage_defaults'))
with check(public.has_permission('packages.manage_defaults'));
create policy package_content_template_items_select_rbac on public.package_content_template_items for select to authenticated using(
  public.has_permission('packages.view') or public.has_permission('packages.create') or
  public.has_permission('packages.update') or public.has_permission('packages.manage_defaults')
);
create policy package_content_template_items_write_rbac on public.package_content_template_items for all to authenticated
using(public.has_permission('packages.manage_defaults'))
with check(public.has_permission('packages.manage_defaults'));

create policy package_content_create_owner on public.package_content_items for insert to authenticated with check(
  public.has_permission('packages.create') and exists(
    select 1 from public.packages package where package.id=package_id and package.created_by=(select auth.uid())
  )
);

grant select,insert,update,delete on public.package_content_templates,
  public.package_content_template_sections,public.package_content_template_items to authenticated;

do $$
declare
  template_id uuid;
  inclusion_id uuid;
  exclusion_id uuid;
  booking_id uuid;
  hotel_id uuid;
  vehicle_id uuid;
  permit_id uuid;
  weather_id uuid;
  amendment_id uuid;
  force_id uuid;
  general_id uuid;
  cancellation_id uuid;
  reschedule_id uuid;
  promise_id uuid;
begin
  insert into public.package_content_templates(name,slug,version,status,is_default,notes)
  values('Awesome Routes Standard Policies','awesome-routes-standard',1,'active',true,'Default package terms, exclusions and policy content.')
  returning id into template_id;

  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'inclusion','Tour Inclusions',1) returning id into inclusion_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'exclusion','Tour Exclusions',2) returning id into exclusion_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','1. Booking & Payment',10) returning id into booking_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','2. Hotels & Accommodation',20) returning id into hotel_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','3. Vehicle & Transportation',30) returning id into vehicle_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','4. Permits & Documents',40) returning id into permit_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','5. Weather & Road Conditions',50) returning id into weather_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','6. Amendments, Cancellations & Rescheduling',60) returning id into amendment_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','7. Force Majeure',70) returning id into force_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'terms','8. General',80) returning id into general_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'cancellation','Cancellation & Refund Policy',90) returning id into cancellation_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'reschedule','Reschedule Policy',100) returning id into reschedule_id;
  insert into public.package_content_template_sections(template_id,section_type,title,display_order) values
    (template_id,'value_promise','Best Value Promise',110) returning id into promise_id;

  insert into public.package_content_template_items(section_id,content,display_order) values
    (exclusion_id,'Airfare or train fare unless specifically included in the package.',1),
    (exclusion_id,'Lunches, beverages and meals not specifically shown as included in the itinerary.',2),
    (exclusion_id,'Entry tickets, parking, boating, cave access and activity charges unless specifically listed under Tour Inclusions.',3),
    (exclusion_id,'Personal expenses including laundry, phone calls, tips, porterage and camera or video fees.',4),
    (exclusion_id,'Additional safaris, optional activities or tours not specified in the itinerary.',5),
    (exclusion_id,'Guide services unless specifically mentioned under Tour Inclusions.',6),
    (exclusion_id,'Any statutory tax or supplier charge not expressly included in the quoted package price.',7),
    (booking_id,'A booking is confirmed only after receipt of a 30% advance payment.',1),
    (booking_id,'Full and final payment must be cleared before commencement of the tour.',2),
    (booking_id,'Prices remain subject to hotel, activity and vehicle availability at the time of booking.',3),
    (booking_id,'Online or card payments may attract a third-party convenience fee. NEFT, IMPS and bank transfers do not carry an Awesome Routes convenience fee.',4),
    (hotel_id,'If a mentioned hotel is unavailable, a similar hotel in the same category may be offered. Any applicable price difference will be communicated.',1),
    (hotel_id,'Early check-in and late check-out are subject to the hotel policy and cannot be guaranteed.',2),
    (hotel_id,'Hotel facilities in remote or hilly regions may be basic due to geographical limitations.',3),
    (hotel_id,'Heater charges, child policy and extra-bed charges will follow the selected hotel rules unless already included.',4),
    (hotel_id,'Peak-season or special-date supplements are payable when they are not included in the confirmed package price.',5),
    (vehicle_id,'The vehicle is provided for services specified in the confirmed itinerary.',1),
    (vehicle_id,'Extra sightseeing, personal use or route deviation may attract additional charges.',2),
    (vehicle_id,'Air-conditioning may be switched off in hilly areas when required for safety.',3),
    (vehicle_id,'Pickup and drop outside 06:00 AM to 09:00 PM require prior confirmation and may attract additional charges.',4),
    (permit_id,'Guests must carry original government-issued photo identification during the tour.',1),
    (permit_id,'Permits remain subject to approval by local authorities; delays or denial caused by government regulations are outside the company control.',2),
    (weather_id,'Weather in the Northeast can be unpredictable. Landslides, roadblocks or adverse conditions may require itinerary changes.',1),
    (weather_id,'Awesome Routes is not responsible for delays or additional expenses caused by natural calamities or other unavoidable conditions.',2),
    (weather_id,'The itinerary may be modified when reasonably required for guest safety.',3),
    (amendment_id,'Guest-requested last-minute changes may attract additional charges.',1),
    (amendment_id,'Cancellation and rescheduling remain subject to this policy and applicable supplier charges.',2),
    (force_id,'Awesome Routes is not liable for disruption, delay or cancellation caused by strikes, political disturbances, natural disasters or circumstances beyond reasonable control.',1),
    (general_id,'Meals are provided strictly according to the confirmed itinerary and meal plan.',1),
    (general_id,'Refund processing normally takes 7 to 15 working days after approval and supplier reconciliation.',2),
    (general_id,'Partial refunds are not available for unused services forming part of a confirmed package unless approved in writing.',3),
    (general_id,'Meal, refreshment and photography stops are subject to the overall travel schedule and local safety conditions.',4),
    (general_id,'When an included service is missed because of an operational issue, Awesome Routes will make reasonable efforts to arrange a suitable alternative.',5),
    (general_id,'No hidden fees are charged by Awesome Routes. Guests should immediately report any unauthorized payment demand.',6),
    (general_id,'Tour support and the applicable contact details will be shared after booking confirmation.',7),
    (cancellation_id,'More than 21 days before arrival: 20% of the total tour cost.',1),
    (cancellation_id,'21 to 7 days before arrival: 35% of the total tour cost.',2),
    (cancellation_id,'7 days to 24 hours before arrival: 50% of the total tour cost.',3),
    (cancellation_id,'Less than 24 hours before arrival: no refund.',4),
    (cancellation_id,'Approved refunds are processed after deducting the cancellation charge and actual supplier charges. Bank reflection may take 5 to 15 working days.',5),
    (reschedule_id,'More than 45 days before travel: 5% of the total tour cost.',1),
    (reschedule_id,'45 to 21 days before travel: 10% of the total tour cost.',2),
    (reschedule_id,'21 to 7 days before travel: 15% of the total tour cost.',3),
    (reschedule_id,'Within 7 days of travel: rescheduling is not allowed.',4),
    (reschedule_id,'Rescheduling is subject to availability and is allowed once per confirmed booking.',5),
    (promise_id,'If an equivalent tour with the same dates, services and inclusions is available at a lower verifiable price, Awesome Routes will make reasonable efforts to match or improve the offer.',1),
    (promise_id,'Our goal is transparent pricing, honest service and maximum value for every journey.',2);
end;
$$;

do $$
declare
  template_row public.package_content_templates%rowtype;
  package_row record;
begin
  select * into template_row from public.package_content_templates where is_default and status='active' limit 1;
  if template_row.id is null then return; end if;

  insert into public.package_content_items(
    package_id,item_type,section_title,content,display_order,
    source_template_item_id,is_system_generated,is_customized
  )
  select package.id,section.section_type,section.title,item.content,
    (section.display_order*10+item.display_order)::smallint,
    item.id,false,false
  from public.packages package
  cross join public.package_content_template_sections section
  join public.package_content_template_items item on item.section_id=section.id
  where package.status in('draft','inactive')
    and section.template_id=template_row.id and item.status='active'
  on conflict(package_id,source_template_item_id)
    where source_template_item_id is not null do nothing;

  perform set_config('app.package_content_sync','1',true);
  update public.packages set content_template_id=template_row.id,
    content_template_version=template_row.version,content_synced_at=now()
  where status in('draft','inactive') and content_template_id is null;
  perform set_config('app.package_content_sync','0',true);

  for package_row in select id from public.packages where status in('draft','inactive') loop
    perform public.rebuild_package_generated_content(package_row.id);
  end loop;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'package_content_templates','package_content_template_sections','package_content_template_items'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_row_audit()',table_name||'_audit',table_name);
  end loop;
end;
$$;

commit;
