import test from "node:test";
import assert from "node:assert/strict";
import { fixture, uid } from "./fixtures/custom-itinerary.mjs";
import { calculateItinerary } from "../src/lib/custom-itineraries/pricing.ts";
import {
  parseItinerary,
  pricingSignature,
} from "../src/lib/custom-itineraries/validation.ts";
import { makeQuoteDocument } from "../src/lib/custom-itineraries/document.ts";
import { itineraryDayDate } from "../src/lib/custom-itineraries/dates.ts";
test("day dates cross month, leap day and year without timezone drift", () => {
  assert.equal(itineraryDayDate("2028-02-28", 2), "2028-02-29");
  assert.equal(itineraryDayDate("2028-02-28", 3), "2028-03-01");
  assert.equal(itineraryDayDate("2026-12-31", 2), "2027-01-01");
  assert.equal(itineraryDayDate("2026-02-30", 1), "");
  assert.equal(itineraryDayDate("", 1), "");
});
test("final override replaces group total, preserves components and stays out of public notes", () => {
  const { value, refs } = fixture();
  const original = calculateItinerary(value, refs);
  const signature = pricingSignature(value);
  value.total_override_paise = 1000000;
  value.total_override_reason = "PRIVATE NEGOTIATION";
  value.advance_paise = 100000;
  const c = calculateItinerary(parseItinerary(value), refs);
  assert.equal(c.calculated_total_paise, original.total_paise);
  assert.equal(c.total_paise, 1000000);
  assert.equal(c.balance_paise, 900000);
  assert.equal(c.vehicle_paise, original.vehicle_paise);
  assert.notEqual(pricingSignature(value), signature);
  const doc = makeQuoteDocument(value, c, refs, "2026-09-04");
  assert.equal(doc.total_paise, 1000000);
  assert.equal(doc.days[0].date, value.travel_date);
  assert.ok(!JSON.stringify(doc).includes("PRIVATE NEGOTIATION"));
  value.total_override_paise = 0;
  value.advance_paise = 0;
  assert.equal(calculateItinerary(value, refs).total_paise, 0);
  value.total_override_reason = "";
  assert.throws(() => parseItinerary(value), /reason/);
  value.total_override_paise = null;
  assert.equal(
    calculateItinerary(value, refs).total_paise,
    original.total_paise,
  );
});
test("hotel + variant safari + mandatory entry fees + vehicle total", () => {
  const { value, refs } = fixture();
  const c = calculateItinerary(parseItinerary(value), refs);
  assert.deepEqual(c.warnings, []);
  assert.equal(c.hotel_paise, 228000);
  assert.equal(c.activity_paise, 323000);
  assert.equal(c.vehicle_paise, 600000);
  assert.equal(c.total_paise, 1151000);
});
test("3 adults can use one room and extra bed, or separate rooms", () => {
  const { value, refs, stay, activity } = fixture();
  value.adults = 3;
  stay.adults = 3;
  stay.extra_adult_beds = 1;
  activity.adults = 3;
  assert.equal(calculateItinerary(value, refs).hotel_paise, 328000);
  stay.rooms = 2;
  stay.extra_adult_beds = 0;
  assert.equal(calculateItinerary(value, refs).hotel_paise, 456000);
});
test("room override wins and zero custom override is preserved", () => {
  const { value, refs, stay, ids } = fixture();
  refs.hotel_rates.push({
    ...refs.hotel_rates[0],
    id: uid(),
    hotel_id: ids.hotel,
    room_id: ids.room,
    base_room_rate_paise: 350000,
  });
  assert.equal(calculateItinerary(value, refs).hotel_paise, 350000);
  stay.override_total_paise = 0;
  stay.override_reason = "Complimentary stay";
  assert.equal(calculateItinerary(value, refs).hotel_paise, 0);
});
test("child sharing price and occupancy policy are enforced", () => {
  const { value, refs, stay } = fixture();
  value.children = 1;
  stay.children_without_bed = 1;
  assert.equal(calculateItinerary(value, refs).hotel_paise, 288000);
  refs.hotel_rates[0].child_pricing_policy = "adult_rate";
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /sharing is not allowed/,
  );
});
test("invalid hotel room, missing rate and inactive catalog block finalization", () => {
  const { value, refs, stay } = fixture();
  stay.room_id = uid();
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /Room does not match/,
  );
  stay.room_id = null;
  refs.hotel_rates = [];
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /No matching active/,
  );
  refs.hotels[0].status = "inactive";
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /active hotel/,
  );
});
test("optional activity is listed but excluded from group total", () => {
  const { value, refs, activity } = fixture();
  activity.optional = true;
  const c = calculateItinerary(value, refs);
  assert.equal(c.activity_paise, 0);
  assert.equal(c.lines.filter((x) => x.optional).length, 1);
});
test("selected activity variant must belong to its offering", () => {
  const { value, refs, activity } = fixture();
  activity.variant_id = uid();
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /active variant/,
  );
});
test("multiple cars billed on every day including rest day", () => {
  const { value, refs, transport } = fixture();
  value.days.push({
    ...value.days[0],
    id: uid(),
    day_number: 2,
    stays: [],
    activities: [],
    overnight_location_id: null,
  });
  transport.quantity = 2;
  transport.end_day = 2;
  const c = calculateItinerary(value, refs);
  assert.equal(c.vehicle_paise, 2400000);
  assert.deepEqual(c.warnings, []);
  const d = makeQuoteDocument(value, c, refs, "2026-09-04");
  assert.ok(d.days[1].services.some((x) => x.label.includes("Innova")));
});
test("luggage-only vehicle cannot satisfy passenger seat requirements", () => {
  const { value, refs, transport } = fixture();
  transport.luggage_only = true;
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /passenger seats/,
  );
});
test("overlapping driver/fleet assignment is rejected", () => {
  const { value, refs, transport, ids } = fixture();
  transport.driver_id = ids.driver;
  transport.fleet_id = ids.fleet;
  value.transport.push({ ...transport, id: uid() });
  assert.match(
    calculateItinerary(value, refs).warnings.join(" "),
    /assigned twice/,
  );
});
test("markup discount advance and frozen public snapshot", () => {
  const { value, refs } = fixture();
  value.markup_bps = 1000;
  value.discount_paise = 50000;
  value.advance_paise = 100000;
  const c = calculateItinerary(value, refs);
  assert.equal(c.total_paise, 1216100);
  assert.equal(c.balance_paise, 1116100);
  const d = makeQuoteDocument(value, c, refs, "2026-09-04");
  assert.equal(d.costs.length, 1);
  assert.equal(d.costs[0].label, "Vehicle allocation");
  assert.ok(!JSON.stringify(d).includes("PRIVATE INTERNAL"));
  refs.hotel_rates[0].base_room_rate_paise = 900000;
  assert.equal(d.total_paise, 1216100);
  assert.notEqual(calculateItinerary(value, refs).total_paise, d.total_paise);
});
test("validation rejects impossible dates, duplicate IDs, over-allocation and missing override reason", () => {
  const { value, stay } = fixture();
  assert.throws(() => parseItinerary({ ...value, travel_date: "2026-02-30" }));
  assert.throws(() =>
    parseItinerary({
      ...value,
      days: [value.days[0], { ...value.days[0], day_number: 2 }],
    }),
  );
  stay.adults = 3;
  assert.throws(() => parseItinerary(value));
  stay.adults = 2;
  stay.override_total_paise = 0;
  assert.throws(() => parseItinerary(value));
});
test("pricing signature includes overrides but ignores customer notes", () => {
  const { value, stay } = fixture();
  const original = pricingSignature(value);
  value.public_notes = "New notes";
  assert.equal(pricingSignature(value), original);
  stay.override_total_paise = 1;
  stay.override_reason = "test";
  assert.notEqual(pricingSignature(value), original);
});
