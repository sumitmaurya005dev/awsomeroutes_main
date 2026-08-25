import type {
  ActivityCharge,
  ActivityParticipantPrice,
  PricingModel,
} from "@/types/activity";

export type ParticipantCounts = Partial<
  Record<"infant" | "child" | "adult" | "senior" | "participant", number>
>;

export type ActivityPriceInput = {
  pricingModel: PricingModel;
  basePricePaise: number;
  capacityPerUnit: number | null;
  maximumUnitsPerBooking?: number | null;
  maximumParticipantsPerBooking?: number | null;
  minimumParticipants: number;
  minimumBillableParticipants: number;
  taxIncluded: boolean;
  taxRateBps: number;
  participants: ParticipantCounts;
  participantPrices?: Pick<
    ActivityParticipantPrice,
    | "activity_variant_id"
    | "participant_type"
    | "price_paise"
    | "capacity_count"
    | "status"
  >[];
  charges?: Pick<
    ActivityCharge,
    | "id"
    | "activity_variant_id"
    | "name"
    | "calculation_type"
    | "amount_paise"
    | "mandatory"
    | "taxable"
    | "status"
  >[];
  variantId?: string | null;
  priceOverridePaise?: number | null;
  selectedOptionalChargeIds?: string[];
  unitOverride?: number;
};

export type ActivityPriceBreakdown = {
  totalParticipants: number;
  capacityParticipants: number;
  billableParticipants: number;
  units: number;
  baseAmountPaise: number;
  participantAmountPaise: number;
  chargeLines: {
    id: string;
    name: string;
    quantity: number;
    amountPaise: number;
  }[];
  additionalChargesPaise: number;
  taxPaise: number;
  totalPaise: number;
};

function safeCount(value: number | undefined) {
  return Number.isInteger(value) && (value ?? 0) > 0 ? (value ?? 0) : 0;
}

export function calculateActivityPrice(
  input: ActivityPriceInput,
): ActivityPriceBreakdown {
  const counts = {
    infant: safeCount(input.participants.infant),
    child: safeCount(input.participants.child),
    adult: safeCount(input.participants.adult),
    senior: safeCount(input.participants.senior),
    participant: safeCount(input.participants.participant),
  };
  const totalParticipants = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (totalParticipants < input.minimumParticipants) {
    throw new Error(
      `This activity requires at least ${input.minimumParticipants} participant${input.minimumParticipants === 1 ? "" : "s"}.`,
    );
  }
  if (
    input.maximumParticipantsPerBooking &&
    totalParticipants > input.maximumParticipantsPerBooking
  ) {
    throw new Error(
      `A single booking allows a maximum of ${input.maximumParticipantsPerBooking} participants.`,
    );
  }

  // Participant rate overrides belong only to per-person pricing. Other
  // models use their fixed unit/group/session base plus explicit charges.
  const scopedParticipantPrices =
    input.pricingModel === "per_person"
      ? (input.participantPrices ?? []).filter(
          (price) =>
            price.status === "active" &&
            (price.activity_variant_id === null ||
              price.activity_variant_id === input.variantId),
        )
      : [];
  const participantPriceMap = new Map<
    string,
    (typeof scopedParticipantPrices)[number]
  >();
  for (const price of scopedParticipantPrices) {
    const current = participantPriceMap.get(price.participant_type);
    if (!current || price.activity_variant_id === input.variantId)
      participantPriceMap.set(price.participant_type, price);
  }
  const capacityParticipants = (
    Object.entries(counts) as Array<[keyof typeof counts, number]>
  ).reduce((sum, [type, count]) => {
    const participantPrice =
      participantPriceMap.get(type) ?? participantPriceMap.get("participant");
    return sum + count * (participantPrice?.capacity_count ?? 1);
  }, 0);
  const capacity = input.capacityPerUnit;
  const automaticUnits =
    input.pricingModel === "per_unit" && capacity
      ? Math.max(1, Math.ceil(capacityParticipants / capacity))
      : 1;
  const units =
    input.unitOverride === undefined
      ? automaticUnits
      : Math.max(1, Math.ceil(input.unitOverride));
  if (input.maximumUnitsPerBooking && units > input.maximumUnitsPerBooking) {
    throw new Error(
      `A single booking allows a maximum of ${input.maximumUnitsPerBooking} units.`,
    );
  }
  if (
    input.unitOverride !== undefined &&
    input.pricingModel === "per_unit" &&
    capacity &&
    units * capacity < capacityParticipants
  ) {
    throw new Error(
      `At least ${automaticUnits} units are required for this group.`,
    );
  }

  const billableParticipants = Math.max(
    totalParticipants,
    input.minimumBillableParticipants,
  );
  const effectiveBasePricePaise =
    input.priceOverridePaise ?? input.basePricePaise;
  let baseAmountPaise = effectiveBasePricePaise;
  if (input.pricingModel === "per_unit") baseAmountPaise *= units;
  const participantAmountPaise = 0;
  if (input.pricingModel === "per_person") {
    baseAmountPaise =
      (Object.entries(counts) as Array<[keyof typeof counts, number]>).reduce(
        (sum, [type, count]) => {
          const participantPrice =
            participantPriceMap.get(type) ??
            participantPriceMap.get("participant");
          return (
            sum +
            count * (participantPrice?.price_paise ?? effectiveBasePricePaise)
          );
        },
        0,
      ) +
      Math.max(0, billableParticipants - totalParticipants) *
        effectiveBasePricePaise;
  }

  const selectedOptional = new Set(input.selectedOptionalChargeIds ?? []);
  const chargeLines = (input.charges ?? [])
    .filter(
      (charge) =>
        charge.status === "active" &&
        (charge.activity_variant_id === null ||
          charge.activity_variant_id === input.variantId) &&
        (charge.mandatory || selectedOptional.has(charge.id)),
    )
    .map((charge) => {
      let quantity = 1;
      if (charge.calculation_type === "per_person")
        quantity = totalParticipants;
      if (charge.calculation_type === "per_adult") quantity = counts.adult;
      if (charge.calculation_type === "per_child") quantity = counts.child;
      if (charge.calculation_type === "per_unit") quantity = units;
      return {
        id: charge.id,
        name: charge.name,
        quantity,
        amountPaise: charge.amount_paise * quantity,
        taxable: charge.taxable,
      };
    });
  const additionalChargesPaise = chargeLines.reduce(
    (sum, charge) => sum + charge.amountPaise,
    0,
  );
  const taxableChargesPaise = chargeLines
    .filter((charge) => charge.taxable)
    .reduce((sum, charge) => sum + charge.amountPaise, 0);
  const taxPaise = input.taxIncluded
    ? 0
    : Math.round(
        ((baseAmountPaise + participantAmountPaise + taxableChargesPaise) *
          input.taxRateBps) /
          10_000,
      );
  const totalPaise =
    baseAmountPaise +
    participantAmountPaise +
    additionalChargesPaise +
    taxPaise;

  for (const amount of [
    baseAmountPaise,
    participantAmountPaise,
    additionalChargesPaise,
    taxPaise,
    totalPaise,
  ]) {
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error(
        "The calculated activity price is outside the supported range.",
      );
  }

  return {
    totalParticipants,
    capacityParticipants,
    billableParticipants,
    units,
    baseAmountPaise,
    participantAmountPaise,
    chargeLines: chargeLines.map(({ id, name, quantity, amountPaise }) => ({
      id,
      name,
      quantity,
      amountPaise,
    })),
    additionalChargesPaise,
    taxPaise,
    totalPaise,
  };
}

export function formatPaise(amountPaise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);
}
