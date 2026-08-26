import test from "node:test";
import assert from "node:assert/strict";
import {
  assessVehicleCapacity,
  calculateVehicleTotalPaise,
  resolveVehicleDailyRate,
} from "../src/lib/vehicles/pricing.ts";

const rates = [
  { model_id: null, vendor_id: null, daily_rate_paise: 600000 },
  { model_id: "innova", vendor_id: null, daily_rate_paise: 650000 },
  { model_id: null, vendor_id: "vendor-a", daily_rate_paise: 620000 },
  { model_id: "innova", vendor_id: "vendor-a", daily_rate_paise: 680000 },
];

test("vehicle rate resolution uses the most specific model and vendor rate", () => {
  assert.equal(resolveVehicleDailyRate(rates, { modelId: "innova", vendorId: "vendor-a" })?.daily_rate_paise, 680000);
  assert.equal(resolveVehicleDailyRate(rates, { modelId: "innova" })?.daily_rate_paise, 650000);
  assert.equal(resolveVehicleDailyRate(rates, { vendorId: "vendor-a" })?.daily_rate_paise, 620000);
  assert.equal(resolveVehicleDailyRate(rates, {})?.daily_rate_paise, 600000);
});

test("seven package days charge seven complete vehicle days", () => {
  assert.equal(calculateVehicleTotalPaise({ dailyRatePaise: 600000, days: 7, quantity: 1 }), 4200000);
});

test("multiple vehicles and luggage are assessed independently", () => {
  const twoInnovas = assessVehicleCapacity({ passengers: 7, luggage: 7, vehicles: [{ quantity: 2, seatingCapacity: 7, comfortCapacity: 6, luggageCapacity: 5 }] });
  assert.equal(twoInnovas.comfortablyFits, true);
  assert.equal(twoInnovas.luggageFits, true);
  const oneInnova = assessVehicleCapacity({ passengers: 7, luggage: 7, vehicles: [{ quantity: 1, seatingCapacity: 7, comfortCapacity: 6, luggageCapacity: 5 }] });
  assert.equal(oneInnova.legallyFits, true);
  assert.equal(oneInnova.comfortablyFits, false);
  assert.equal(oneInnova.luggageFits, false);
});

test("invalid pricing inputs cannot produce totals", () => {
  assert.throws(() => calculateVehicleTotalPaise({ dailyRatePaise: -1, days: 7, quantity: 1 }));
  assert.throws(() => calculateVehicleTotalPaise({ dailyRatePaise: 600000, days: 0, quantity: 1 }));
});
