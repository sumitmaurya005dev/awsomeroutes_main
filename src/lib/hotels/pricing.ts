import type { HotelRateCard } from "@/types/hotel";

export const HOTEL_AGE_BANDS = {
  infant: { minimumAge: 0, maximumAge: 4 },
  child: { minimumAge: 5, maximumAge: 11 },
  adult: { minimumAge: 12, maximumAge: null },
} as const;

export function calculateAdultRoomPrice(
  adults: number,
  nights: number,
  rate: Pick<HotelRateCard, "base_room_rate_paise" | "extra_adult_bed_paise">,
) {
  if (!Number.isInteger(adults) || adults < 1)
    throw new Error("At least one adult is required.");
  if (!Number.isInteger(nights) || nights < 1)
    throw new Error("At least one night is required.");
  const rooms = Math.max(1, Math.floor(adults / 2));
  const extraBeds = adults === 1 ? 0 : adults % 2;
  const perNight =
    rooms * rate.base_room_rate_paise + extraBeds * rate.extra_adult_bed_paise;
  return {
    rooms,
    extraBeds,
    perNightPaise: perNight,
    totalPaise: perNight * nights,
  };
}

export function calculateHotelStayPrice(
  guests: {
    adults: number;
    childrenWithBed: number;
    childrenWithoutBed: number;
    infantsSharing: number;
  },
  nights: number,
  rate: Pick<
    HotelRateCard,
    | "base_room_rate_paise"
    | "extra_adult_bed_paise"
    | "child_with_bed_paise"
    | "child_without_bed_paise"
    | "infant_sharing_paise"
    | "child_pricing_policy"
    | "child_with_bed_allowed"
    | "child_without_bed_allowed"
  >,
) {
  for (const [name, value] of Object.entries(guests)) {
    if (!Number.isInteger(value) || value < 0)
      throw new Error(`${name} must be a non-negative whole number.`);
  }
  if (guests.adults < 1) throw new Error("At least one adult is required.");
  if (guests.childrenWithBed > 0 && !rate.child_with_bed_allowed)
    throw new Error("This rate does not allow a child extra bed.");
  if (guests.childrenWithoutBed > 0 && !rate.child_without_bed_allowed)
    throw new Error("This rate does not allow child parent-sharing.");

  const adult = calculateAdultRoomPrice(guests.adults, 1, rate);
  const childBedRate =
    rate.child_pricing_policy === "adult_rate"
      ? rate.extra_adult_bed_paise
      : rate.child_with_bed_paise;
  const perNightPaise =
    adult.perNightPaise +
    guests.childrenWithBed * childBedRate +
    guests.childrenWithoutBed * rate.child_without_bed_paise +
    guests.infantsSharing * rate.infant_sharing_paise;
  return {
    rooms: adult.rooms,
    adultExtraBeds: adult.extraBeds,
    childExtraBeds: guests.childrenWithBed,
    perNightPaise,
    totalPaise: perNightPaise * nights,
  };
}

export function resolveHotelRate(
  rates: HotelRateCard[],
  locationId: string,
  categoryId: string,
  hotelId: string,
  roomId: string | null,
  mealPlan: HotelRateCard["meal_plan"],
) {
  return (
    rates.find(
      (r) =>
        r.room_id === roomId && roomId !== null && r.meal_plan === mealPlan,
    ) ??
    rates.find(
      (r) =>
        r.hotel_id === hotelId &&
        r.room_id === null &&
        r.category_id === categoryId &&
        r.meal_plan === mealPlan,
    ) ??
    rates.find(
      (r) =>
        r.hotel_id === null &&
        r.location_id === locationId &&
        r.category_id === categoryId &&
        r.meal_plan === mealPlan,
    ) ??
    null
  );
}
