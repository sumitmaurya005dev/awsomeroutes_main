import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateActivityPrice } from "../src/lib/activities/pricing.ts";

const activityMutations = readFileSync(
  new URL("../src/lib/activities/mutations.ts", import.meta.url),
  "utf8",
);

test("activity pricing changes invalidate linked package price pages", () => {
  assert.match(
    activityMutations,
    /revalidatePath\("\/home\/packages\/\[id\]\/edit", "page"\)/,
  );
  for (const mutation of [
    "saveOffering",
    "saveVariant",
    "saveParticipantPrice",
    "saveCharge",
    "saveSlot",
  ]) {
    assert.match(
      activityMutations,
      new RegExp(
        `function ${mutation}[\\s\\S]*?revalidateActivityPricingConsumers\\(\\)`,
      ),
    );
  }
});

test("per-unit safari adds units and mandatory per-person/per-booking charges", () => {
  const result = calculateActivityPrice({
    pricingModel: "per_unit",
    basePricePaise: 450_000,
    capacityPerUnit: 6,
    minimumParticipants: 1,
    minimumBillableParticipants: 1,
    taxIncluded: true,
    taxRateBps: 0,
    participants: { adult: 5, child: 2 },
    charges: [
      {
        id: "insurance",
        activity_variant_id: null,
        name: "Insurance",
        calculation_type: "per_person",
        amount_paise: 5_000,
        mandatory: true,
        taxable: false,
        status: "active",
      },
      {
        id: "welfare",
        activity_variant_id: null,
        name: "Welfare",
        calculation_type: "per_person",
        amount_paise: 2_500,
        mandatory: true,
        taxable: false,
        status: "active",
      },
      {
        id: "permit",
        activity_variant_id: null,
        name: "Permit",
        calculation_type: "per_booking",
        amount_paise: 50_000,
        mandatory: true,
        taxable: false,
        status: "active",
      },
    ],
  });
  assert.equal(result.units, 2);
  assert.equal(result.baseAmountPaise, 900_000);
  assert.equal(result.additionalChargesPaise, 102_500);
  assert.equal(result.totalPaise, 1_002_500);
});

test("per-person pricing uses adult and child rates", () => {
  const result = calculateActivityPrice({
    pricingModel: "per_person",
    basePricePaise: 220_000,
    capacityPerUnit: null,
    minimumParticipants: 1,
    minimumBillableParticipants: 1,
    taxIncluded: true,
    taxRateBps: 0,
    participants: { adult: 2, child: 1 },
    participantPrices: [
      {
        activity_variant_id: null,
        participant_type: "adult",
        price_paise: 220_000,
        capacity_count: 1,
        status: "active",
      },
      {
        activity_variant_id: null,
        participant_type: "child",
        price_paise: 200_000,
        capacity_count: 1,
        status: "active",
      },
    ],
  });
  assert.equal(result.baseAmountPaise, 640_000);
  assert.equal(result.totalPaise, 640_000);
});

test("per-unit pricing ignores participant rate records and uses explicit charges", () => {
  const result = calculateActivityPrice({
    pricingModel: "per_unit",
    basePricePaise: 280_000,
    capacityPerUnit: 6,
    minimumParticipants: 1,
    minimumBillableParticipants: 1,
    taxIncluded: true,
    taxRateBps: 0,
    participants: { adult: 2, child: 30 },
    participantPrices: [
      {
        activity_variant_id: null,
        participant_type: "child",
        price_paise: 80_000,
        capacity_count: 1,
        status: "active",
      },
    ],
    charges: [
      {
        id: "entry",
        activity_variant_id: null,
        name: "Entry",
        calculation_type: "per_person",
        amount_paise: 11_500,
        mandatory: true,
        taxable: false,
        status: "active",
      },
    ],
  });

  assert.equal(result.units, 6);
  assert.equal(result.baseAmountPaise, 1_680_000);
  assert.equal(result.participantAmountPaise, 0);
  assert.equal(result.additionalChargesPaise, 368_000);
  assert.equal(result.totalPaise, 2_048_000);
});

test("per-person pricing falls back to the base rate when a participant type has no override", () => {
  const result = calculateActivityPrice({
    pricingModel: "per_person",
    basePricePaise: 100_000,
    capacityPerUnit: null,
    minimumParticipants: 1,
    minimumBillableParticipants: 1,
    taxIncluded: true,
    taxRateBps: 0,
    participants: { adult: 2, child: 1 },
    participantPrices: [
      {
        activity_variant_id: null,
        participant_type: "child",
        price_paise: 80_000,
        capacity_count: 1,
        status: "active",
      },
    ],
  });

  assert.equal(result.baseAmountPaise, 280_000);
  assert.equal(result.totalPaise, 280_000);
});

test("optional charges apply only when selected", () => {
  const input = {
    pricingModel: "per_group",
    basePricePaise: 800_000,
    capacityPerUnit: null,
    minimumParticipants: 1,
    minimumBillableParticipants: 1,
    taxIncluded: true,
    taxRateBps: 0,
    participants: { adult: 4 },
    charges: [
      {
        id: "camera",
        activity_variant_id: null,
        name: "Camera",
        calculation_type: "per_booking",
        amount_paise: 30_000,
        mandatory: false,
        taxable: false,
        status: "active",
      },
    ],
  };
  assert.equal(calculateActivityPrice(input).totalPaise, 800_000);
  assert.equal(
    calculateActivityPrice({ ...input, selectedOptionalChargeIds: ["camera"] })
      .totalPaise,
    830_000,
  );
});

test("variant-specific participant price overrides the general rate", () => {
  const result = calculateActivityPrice({
    pricingModel: "per_person",
    basePricePaise: 200_000,
    capacityPerUnit: null,
    minimumParticipants: 1,
    minimumBillableParticipants: 1,
    taxIncluded: true,
    taxRateBps: 0,
    variantId: "premium",
    participants: { adult: 2 },
    participantPrices: [
      {
        activity_variant_id: null,
        participant_type: "adult",
        price_paise: 200_000,
        capacity_count: 1,
        status: "active",
      },
      {
        activity_variant_id: "premium",
        participant_type: "adult",
        price_paise: 250_000,
        capacity_count: 1,
        status: "active",
      },
    ],
  });
  assert.equal(result.totalPaise, 500_000);
});

test("minimum participants is enforced", () => {
  assert.throws(
    () =>
      calculateActivityPrice({
        pricingModel: "per_person",
        basePricePaise: 100_000,
        capacityPerUnit: null,
        minimumParticipants: 4,
        minimumBillableParticipants: 4,
        taxIncluded: true,
        taxRateBps: 0,
        participants: { adult: 2 },
      }),
    /at least 4 participants/,
  );
});
