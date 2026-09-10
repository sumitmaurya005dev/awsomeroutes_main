import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260910100000_package_pricing_persistence.sql",
    import.meta.url,
  ),
  "utf8",
);

const prerequisiteSchema = String.raw`
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
create function public.has_permission(text) returns boolean language sql stable as $$ select true $$;

create table public.hotel_categories(id uuid primary key);
create table public.packages(
  id uuid primary key, status text not null default 'draft',
  duration_days smallint not null default 1, duration_nights smallint not null default 0
);
create table public.package_itinerary_days(
  id uuid primary key, package_id uuid not null references public.packages(id) on delete cascade,
  overnight_location_id uuid
);
create table public.package_day_activities(
  id uuid primary key, itinerary_day_id uuid not null references public.package_itinerary_days(id) on delete cascade,
  activity_offering_id uuid, activity_variant_id uuid
);
create table public.package_day_hotels(
  id uuid primary key, itinerary_day_id uuid not null references public.package_itinerary_days(id) on delete cascade
);
create table public.package_vehicle_options(
  id uuid primary key, package_id uuid not null references public.packages(id) on delete cascade,
  base_location_id uuid, vehicle_category_id uuid, vehicle_model_id uuid, vendor_id uuid
);
create table public.package_price_adjustments(
  id uuid primary key, package_id uuid not null references public.packages(id) on delete cascade
);
create table public.hotel_rate_cards(
  id uuid primary key, location_id uuid, category_id uuid, hotel_id uuid, room_id uuid,
  base_room_rate_paise bigint, extra_adult_bed_paise bigint, child_with_bed_paise bigint,
  child_without_bed_paise bigint, infant_sharing_paise bigint, meal_plan text, status text
);
create table public.activity_offerings(
  id uuid primary key, base_price_paise bigint, pricing_model text, minimum_participants integer,
  maximum_participants_per_unit integer, maximum_units_per_booking integer,
  maximum_participants_per_booking integer, minimum_billable_participants integer,
  tax_included boolean, tax_rate_bps integer, status text
);
create table public.activity_variants(id uuid primary key, activity_offering_id uuid);
create table public.activity_participant_prices(id uuid primary key, activity_offering_id uuid);
create table public.activity_charges(id uuid primary key, activity_offering_id uuid);
create table public.vehicle_rate_cards(
  id uuid primary key, base_location_id uuid, category_id uuid, model_id uuid,
  vendor_id uuid, daily_rate_paise bigint, status text
);
`;

test("package pricing persistence migration executes against its prerequisite schema", async () => {
  const database = new PGlite();
  try {
    await database.exec(prerequisiteSchema);
    await database.exec(migration);
    const result = await database.query(`
      select table_name from information_schema.tables
      where table_schema='public'
        and table_name in ('package_price_matrix','package_pricing_refresh_queue')
      order by table_name
    `);
    assert.deepEqual(
      result.rows.map((row) => row.table_name),
      ["package_price_matrix", "package_pricing_refresh_queue"],
    );
  } finally {
    await database.close();
  }
});
