import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAdultRoomPrice,
  calculateHotelStayPrice,
  resolveHotelRate,
} from "../src/lib/hotels/pricing.ts";
test("adult room allocation uses double rooms and one bed for odd groups", () => {
  assert.deepEqual(
    calculateAdultRoomPrice(5, 2, {
      base_room_rate_paise: 228000,
      extra_adult_bed_paise: 100000,
    }),
    { rooms: 2, extraBeds: 1, perNightPaise: 556000, totalPaise: 1112000 },
  );
});
test("single adult pays a complete room", () => {
  assert.deepEqual(
    calculateAdultRoomPrice(1, 1, {
      base_room_rate_paise: 228000,
      extra_adult_bed_paise: 100000,
    }),
    { rooms: 1, extraBeds: 0, perNightPaise: 228000, totalPaise: 228000 },
  );
});
test("room override wins over hotel and location defaults", () => {
  const base = {
    location_id: "l",
    category_id: "c",
    meal_plan: "CP",
    hotel_id: null,
    room_id: null,
  };
  const rows = [
    { ...base, id: "location" },
    { ...base, id: "hotel", hotel_id: "h" },
    { ...base, id: "room", hotel_id: "h", room_id: "r" },
  ];
  assert.equal(resolveHotelRate(rows, "l", "c", "h", "r", "CP")?.id, "room");
});
test("child and infant prices use the configured tax-inclusive policy", () => {
  const result = calculateHotelStayPrice(
    { adults: 2, childrenWithBed: 1, childrenWithoutBed: 1, infantsSharing: 1 },
    2,
    {
      base_room_rate_paise: 228000,
      extra_adult_bed_paise: 100000,
      child_with_bed_paise: 80000,
      child_without_bed_paise: 60000,
      infant_sharing_paise: 0,
      child_pricing_policy: "child_rates",
      child_with_bed_allowed: true,
      child_without_bed_allowed: true,
    },
  );
  assert.equal(result.totalPaise, 736000);
});
test("adult-rate child policy rejects parent sharing", () => {
  assert.throws(
    () =>
      calculateHotelStayPrice(
        {
          adults: 2,
          childrenWithBed: 0,
          childrenWithoutBed: 1,
          infantsSharing: 0,
        },
        1,
        {
          base_room_rate_paise: 228000,
          extra_adult_bed_paise: 100000,
          child_with_bed_paise: 0,
          child_without_bed_paise: 0,
          infant_sharing_paise: 0,
          child_pricing_policy: "adult_rate",
          child_with_bed_allowed: true,
          child_without_bed_allowed: false,
        },
      ),
    /does not allow child parent-sharing/,
  );
});
