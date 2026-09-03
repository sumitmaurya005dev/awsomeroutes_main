-- Package stays may use any hotel within the itinerary's overnight destination.
-- Hotel pricing continues to come from the hotel's exact location rate card.
create or replace function public.enforce_package_hotel_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  linked_hotel uuid;
  linked_category uuid;
  overnight_destination uuid;
  hotel_destination uuid;
begin
  select location.destination_id
  into overnight_destination
  from public.package_itinerary_days as day
  join public.locations as location
    on location.id = day.overnight_location_id
  where day.id = new.itinerary_day_id;

  select location.destination_id
  into hotel_destination
  from public.hotels as hotel
  join public.locations as location
    on location.id = hotel.location_id
  where hotel.id = new.hotel_id;

  if overnight_destination is null then
    raise exception 'Set the itinerary overnight location before selecting a hotel.';
  end if;

  if hotel_destination is null or hotel_destination <> overnight_destination then
    raise exception 'The hotel must belong to the itinerary overnight destination.';
  end if;

  if new.hotel_room_id is not null then
    select hotel_id, category_id
    into linked_hotel, linked_category
    from public.hotel_rooms
    where id = new.hotel_room_id;

    if linked_hotel is null
      or linked_hotel <> new.hotel_id
      or linked_category <> new.hotel_category_id then
      raise exception 'The selected room does not belong to this hotel and category.';
    end if;
  end if;

  return new;
end;
$$;
