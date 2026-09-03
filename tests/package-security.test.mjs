import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync(new URL("../supabase/migrations/20260827100000_package_management.sql",import.meta.url),"utf8");
const hotelScopeMigration=readFileSync(new URL("../supabase/migrations/20260827130000_package_hotel_destination_scope.sql",import.meta.url),"utf8");
const contentDefaultsMigration=readFileSync(new URL("../supabase/migrations/20260831100000_package_content_defaults.sql",import.meta.url),"utf8");
const mutations=readFileSync(new URL("../src/lib/packages/mutations.ts",import.meta.url),"utf8");

test("package tables enforce RLS and public access is published-only",()=>{
 for(const table of ["packages","package_itinerary_days","package_day_activities","package_day_hotels","package_vehicle_options","package_price_adjustments"])
  assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
 assert.match(migration,/packages_public[\s\S]*status='published'/);
 assert.match(migration,/enforce_package_status_permission/);
});

test("sensitive package actions require server-side permissions",()=>{
 for(const permission of ["packages.create","packages.update","packages.delete","packages.manage_pricing","packages.publish"])
  assert.match(mutations,new RegExp(`requirePermission\\([^)]*${permission}`));
});

test("package relation guards reject mismatched variants hotels and vehicles",()=>{
 assert.match(migration,/selected activity variant does not belong/i);
 assert.match(migration,/selected room does not belong/i);
 assert.match(migration,/selected vehicle model does not belong/i);
});

test("package hotel save validates overnight location and active pricing on the server",()=>{
 assert.match(mutations,/Set the overnight location before selecting a hotel/);
 assert.match(mutations,/The hotel must belong to the itinerary overnight destination/);
 assert.match(mutations,/resolveHotelRate/);
 assert.match(mutations,/No active room, hotel or location rate matches this selection/);
});

test("package hotel scope allows the same destination while retaining hotel-location pricing",()=>{
 assert.match(hotelScopeMigration,/hotel_destination <> overnight_destination/);
 assert.match(mutations,/eq\("location_id",hotel\.location_id\)/);
});

test("package activity save verifies package ownership and active offering on the server",()=>{
 assert.match(mutations,/This itinerary day does not belong to the selected package/);
 assert.match(mutations,/The selected activity offering is inactive/);
 assert.match(mutations,/This activity does not belong to the selected package/);
});

test("package content defaults are versioned, protected and copied as snapshots",()=>{
 for(const table of ["package_content_templates","package_content_template_sections","package_content_template_items"]){
  assert.match(contentDefaultsMigration,new RegExp(`create table public\\.${table}`));
  assert.match(contentDefaultsMigration,new RegExp(`alter table public\\.${table} enable row level security`));
 }
 assert.match(contentDefaultsMigration,/packages\.manage_defaults/);
 assert.match(contentDefaultsMigration,/sync_package_content_defaults/);
 assert.match(contentDefaultsMigration,/Default content can be synced only to draft or inactive packages/);
 assert.match(contentDefaultsMigration,/source_template_item_id/);
 assert.match(contentDefaultsMigration,/is_customized/);
 assert.match(contentDefaultsMigration,/app\.package_content_sync/);
 assert.match(contentDefaultsMigration,/content_template_id','content_template_version','content_synced_at/);
});

test("itinerary dependencies rebuild generated inclusions without changing customized rows",()=>{
 assert.match(contentDefaultsMigration,/rebuild_package_generated_content/);
 assert.match(contentDefaultsMigration,/is_system_generated and not is_customized/);
 assert.match(contentDefaultsMigration,/package_days_refresh_generated_content/);
 assert.match(contentDefaultsMigration,/package_activities_refresh_generated_content/);
 assert.match(contentDefaultsMigration,/package_vehicles_refresh_generated_content/);
 assert.match(contentDefaultsMigration,/and not selection\.is_optional/);
});

test("new packages use the transactional core save with optional default content",()=>{
 assert.match(mutations,/save_package_core_with_defaults/);
 assert.match(mutations,/p_apply_content_defaults:parsed\.apply_content_defaults/);
});
