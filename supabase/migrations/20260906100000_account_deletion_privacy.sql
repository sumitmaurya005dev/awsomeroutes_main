-- Preserve business/audit history while removing the deleted employee's identity.
-- The profile itself is removed by profiles.id -> auth.users(id) ON DELETE CASCADE.

alter table public.custom_itineraries
  alter column created_by drop not null,
  alter column updated_by drop not null;

alter table public.custom_itineraries
  drop constraint if exists custom_itineraries_created_by_fkey,
  add constraint custom_itineraries_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  drop constraint if exists custom_itineraries_updated_by_fkey,
  add constraint custom_itineraries_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.custom_itinerary_revisions
  alter column created_by drop not null;

alter table public.custom_itinerary_revisions
  drop constraint if exists custom_itinerary_revisions_created_by_fkey,
  add constraint custom_itinerary_revisions_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.custom_itinerary_events
  alter column actor_id drop not null;

alter table public.custom_itinerary_events
  drop constraint if exists custom_itinerary_events_actor_id_fkey,
  add constraint custom_itinerary_events_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;

-- A customer may request erasure after a quotation has been finalized. Keep
-- only non-identifying financial/audit facts and remove editable itinerary
-- details, contact fields and immutable source snapshots.
create or replace function public.custom_itinerary_snapshot_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('app.privacy_anonymization', true) = '1' and tg_op = 'UPDATE' then
    return new;
  end if;
  raise exception 'Quotation revisions are immutable. Create a new revision.' using errcode = '42501';
end;
$$;

create or replace function public.anonymize_custom_itinerary_customer(
  p_actor uuid,
  p_id uuid,
  p_version integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.custom_itineraries%rowtype;
begin
  if not public.custom_itinerary_actor_can(p_actor, 'custom_itineraries.view')
     or not public.custom_itinerary_actor_can(p_actor, 'custom_itineraries.delete') then
    raise exception 'Customer erasure permission required.' using errcode = '42501';
  end if;

  select * into current_row
  from public.custom_itineraries
  where id = p_id
  for update;

  if current_row.id is null then
    raise exception 'Itinerary not found.';
  end if;
  if current_row.version <> p_version then
    raise exception 'Itinerary changed. Reload before anonymizing.' using errcode = '40001';
  end if;

  perform set_config('app.privacy_anonymization', '1', true);

  update public.custom_itinerary_revisions
  set document = jsonb_build_object(
        'schema_version', coalesce(document->'schema_version', '1'::jsonb),
        'reference', coalesce(document->'reference', 'null'::jsonb),
        'revision', coalesce(document->'revision', to_jsonb(revision)),
        'issued_at', coalesce(document->'issued_at', 'null'::jsonb),
        'costs', coalesce(document->'costs', '[]'::jsonb),
        'total_paise', coalesce(document->'total_paise', '0'::jsonb),
        'advance_paise', coalesce(document->'advance_paise', '0'::jsonb),
        'balance_paise', coalesce(document->'balance_paise', '0'::jsonb),
        'anonymized', true
      ),
      calculation = jsonb_build_object(
        'total_paise', coalesce(calculation->'total_paise', '0'::jsonb),
        'anonymized', true
      ),
      source_snapshot = jsonb_build_object('anonymized', true)
  where itinerary_id = p_id;

  delete from public.custom_itinerary_days where itinerary_id = p_id;
  delete from public.custom_itinerary_transport where itinerary_id = p_id;

  update public.custom_itineraries
  set title = 'Anonymized quotation',
      customer_name = 'Deleted customer',
      customer_email = '',
      customer_phone = '',
      travel_date = null,
      valid_until = null,
      source_package_id = null,
      public_notes = '',
      internal_notes = '',
      terms = '',
      version = version + 1,
      updated_by = p_actor,
      updated_at = now()
  where id = p_id;

  insert into public.custom_itinerary_events(itinerary_id, actor_id, action, version)
  values (p_id, p_actor, 'customer_anonymized', p_version + 1);
end;
$$;

revoke all on function public.anonymize_custom_itinerary_customer(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.anonymize_custom_itinerary_customer(uuid, uuid, integer)
  to service_role;
