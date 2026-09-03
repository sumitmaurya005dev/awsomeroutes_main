import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getDeleteDependencyMessage } from "../src/lib/database/delete-error.ts";

test("location foreign keys return specific actionable messages", () => {
  for (const [constraint, expected] of [
    ["hotels_location_id_fkey", /hotels use it/i],
    ["activity_offerings_location_id_fkey", /activity offerings/i],
    ["vehicle_rate_cards_base_location_id_fkey", /vehicle pricing/i],
    ["package_itinerary_days_overnight_location_id_fkey", /overnight stop/i],
  ]) {
    const result = getDeleteDependencyMessage(
      { code: "23503", message: `violates constraint ${constraint}` },
      "fallback",
    );
    assert.match(result, expected);
  }
});

test("location deletion verifies that a database row was actually deleted", () => {
  const source = readFileSync(new URL("../src/lib/locations/mutations.ts", import.meta.url), "utf8");
  assert.match(source, /delete\(\)[\s\S]*select\("id"\)[\s\S]*maybeSingle\(\)/);
  assert.match(source, /if \(!deleted\)/);
  assert.match(source, /revalidatePath\("\/home\/locations"\)/);
});
