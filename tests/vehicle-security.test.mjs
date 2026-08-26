import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260826130000_vehicle_management.sql", import.meta.url), "utf8");
const displayOrderMigration = readFileSync(new URL("../supabase/migrations/20260826160000_remove_vehicle_display_order.sql", import.meta.url), "utf8");
const managementUi = readFileSync(new URL("../src/components/vehicles/vehicle-management.tsx", import.meta.url), "utf8");
const searchableSelectUi = readFileSync(new URL("../src/components/vehicles/vehicle-searchable-select.tsx", import.meta.url), "utf8");

test("vehicle tables enable row level security and expose no anonymous grants", () => {
  for (const table of ["vehicle_categories", "vehicle_models", "transport_vendors", "drivers", "fleet_vehicles", "vehicle_rate_cards"])
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  assert.doesNotMatch(migration, /grant\s+select[\s\S]*?\s+to\s+anon/i);
});

test("vehicle pricing mutations require manage-pricing permission", () => {
  assert.match(migration, /has_permission\('vehicles\.manage_pricing'\)/);
  assert.match(migration, /vehicle_rates_(insert|update|delete)_rbac/);
});

test("driver and fleet records are protected by RBAC policies", () => {
  assert.match(migration, /'drivers','fleet_vehicles'/);
  assert.match(migration, /has_permission\(''vehicles\.view''\)/);
});

test("fleet comfort capacity is enforced against effective seating capacity", () => {
  assert.match(migration, /enforce_fleet_vehicle_capacity/);
  assert.match(migration, /effective_comfort > effective_seats/);
});

test("super admin receives all vehicle permissions", () => {
  assert.match(migration, /role\.slug = 'super_admin' and permission\.module = 'vehicles'/);
});

test("vehicle editor save button validates and explicitly submits its shared form", () => {
  assert.match(managementUi, /form\.reportValidity\(\)/);
  assert.match(managementUi, /form\.requestSubmit\(\)/);
  assert.match(managementUi, /<Button type="button" onClick=\{requestSave\}/);
});

test("unused vehicle display ordering is removed in favour of name sorting", () => {
  assert.match(displayOrderMigration, /drop column if exists display_order/i);
  assert.doesNotMatch(managementUi, /Display order/);
});

test("vehicle relationship selectors support search and keyboard selection", () => {
  assert.match(searchableSelectUi, /role="combobox"/);
  assert.match(searchableSelectUi, /event\.key === "ArrowDown"/);
  assert.match(searchableSelectUi, /event\.key === "Enter"/);
  assert.match(searchableSelectUi, /event\.key === "Escape"/);
});
