import { calculateActivityPrice } from "../activities/pricing.ts";
import { calculateHotelStayPrice, resolveHotelRate } from "../hotels/pricing.ts";
import { calculateVehicleTotalPaise, resolveVehicleDailyRate } from "../vehicles/pricing.ts";
import type { PackageDetail, PackageReferenceData } from "@/types/package";

export type PackagePriceLine = { label: string; amountPaise: number };
export type PackagePriceCell = {
  pax: number; categoryId: string; categoryName: string; hotelPaise: number; activityPaise: number;
  vehiclePaise: number; adjustmentPaise: number; groupTotalPaise: number; perPersonPaise: number;
  warnings: string[]; lines: PackagePriceLine[];
};

export type PackageHotelRateSource =
  | "room_override"
  | "hotel_override"
  | "location_default";

export function resolvePackageHotelRate(
  rates: PackageReferenceData["hotel_rates"],
  selection: {
    locationId: string | null;
    categoryId: string;
    hotelId: string;
    roomId: string | null;
    mealPlan: PackageReferenceData["hotel_rates"][number]["meal_plan"];
  },
) {
  if (!selection.locationId || !selection.categoryId || !selection.hotelId)
    return null;
  const rate = resolveHotelRate(
    rates,
    selection.locationId,
    selection.categoryId,
    selection.hotelId,
    selection.roomId,
    selection.mealPlan,
  );
  if (!rate) return null;
  const source: PackageHotelRateSource = rate.room_id
    ? "room_override"
    : rate.hotel_id
      ? "hotel_override"
      : "location_default";
  return { rate, source };
}

export function resolvePackageLocationHotelRate(
  rates: PackageReferenceData["hotel_rates"],
  selection: {
    locationId: string | null;
    categoryId: string;
    mealPlan?: PackageReferenceData["hotel_rates"][number]["meal_plan"];
  },
) {
  if (!selection.locationId || !selection.categoryId) return null;
  return (
    rates.find(
      (rate) =>
        rate.status === "active" &&
        rate.location_id === selection.locationId &&
        rate.category_id === selection.categoryId &&
        rate.hotel_id === null &&
        rate.room_id === null &&
        rate.meal_plan === (selection.mealPlan ?? "CP"),
    ) ?? null
  );
}

function roundTo(value: number, multiple: number) {
  return Math.ceil(value / multiple) * multiple;
}

export function calculatePackagePriceMatrix(
  detail: Pick<PackageDetail, "itinerary" | "vehicles" | "price_adjustments">,
  refs: Pick<PackageReferenceData, "hotel_categories" | "hotels" | "hotel_rates" | "activity_offerings" | "vehicle_rates">,
  passengerCounts: readonly number[] = [2, 3, 4, 5, 6],
): PackagePriceCell[] {
  const cells: PackagePriceCell[] = [];
  for (const pax of passengerCounts) {
    if (!Number.isInteger(pax) || pax < 1) throw new Error("Passenger counts must be positive whole numbers.");
    for (const category of refs.hotel_categories) {
      const warnings: string[] = [], lines: PackagePriceLine[] = [];
      let hotelPaise = 0, activityPaise = 0, vehiclePaise = 0;

      for (const day of detail.itinerary) {
        const hotel = day.hotels.find(x => x.hotel_category_id === category.id && x.is_primary);
        if (day.overnight_location_id) {
          const selectedHotel = hotel
            ? refs.hotels.find(x => x.id === hotel.hotel_id)
            : null;
          const selectedRate = hotel
            ? resolvePackageHotelRate(refs.hotel_rates, {
                locationId: selectedHotel?.location_id ?? day.overnight_location_id,
                categoryId: category.id,
                hotelId: hotel.hotel_id,
                roomId: hotel.hotel_room_id,
                mealPlan: hotel.meal_plan,
              })
            : null;
          const locationRate = resolvePackageLocationHotelRate(refs.hotel_rates, {
            locationId: day.overnight_location_id,
            categoryId: category.id,
            mealPlan: "CP",
          });
          const effectiveRate = selectedRate?.rate ?? locationRate;
          if (effectiveRate) {
            const price = calculateHotelStayPrice({ adults: pax, childrenWithBed: 0, childrenWithoutBed: 0, infantsSharing: 0 }, 1, effectiveRate);
            hotelPaise += price.totalPaise;
            const source = selectedRate
              ? selectedRate.source.replaceAll("_", " ")
              : "location default CP";
            lines.push({ label: `Day ${day.day_number} hotel (${source})`, amountPaise: price.totalPaise });
          } else warnings.push(`Day ${day.day_number}: ${category.name} location-default CP rate is missing.`);
        }

        for (const selected of day.activities.filter(x => !x.is_optional)) {
          const offering = refs.activity_offerings.find(x => x.id === selected.activity_offering_id);
          if (!offering) { warnings.push(`Day ${day.day_number}: activity pricing is unavailable.`); continue; }
          try {
            const price = calculateActivityPrice({
              pricingModel: offering.pricing_model, basePricePaise: offering.base_price_paise,
              capacityPerUnit: offering.maximum_participants_per_unit, maximumUnitsPerBooking: offering.maximum_units_per_booking,
              maximumParticipantsPerBooking: offering.maximum_participants_per_booking, minimumParticipants: offering.minimum_participants,
              minimumBillableParticipants: offering.minimum_billable_participants, taxIncluded: offering.tax_included,
              taxRateBps: offering.tax_rate_bps, participants: { adult: pax }, participantPrices: offering.participant_prices,
              charges: offering.charges, variantId: selected.activity_variant_id,
              priceOverridePaise: offering.variants.find(x => x.id === selected.activity_variant_id)?.price_override_paise,
            });
            const amount = price.totalPaise * selected.quantity;
            activityPaise += amount;
            lines.push({ label: `Day ${day.day_number} ${offering.activity?.name ?? "activity"}`, amountPaise: amount });
          } catch (error) { warnings.push(error instanceof Error ? error.message : "Activity price could not be calculated."); }
        }
      }

      const vehicle = detail.vehicles.find(x => pax >= x.minimum_pax && pax <= x.maximum_pax);
      if (vehicle) {
        const candidates = refs.vehicle_rates.filter(x => x.base_location_id === vehicle.base_location_id && x.category_id === vehicle.vehicle_category_id);
        const rate = resolveVehicleDailyRate(candidates, { modelId: vehicle.vehicle_model_id, vendorId: vehicle.vendor_id });
        if (rate) {
          vehiclePaise = calculateVehicleTotalPaise({ dailyRatePaise: rate.daily_rate_paise, days: vehicle.billable_days, quantity: vehicle.quantity });
          lines.push({ label: "Vehicle", amountPaise: vehiclePaise });
        } else warnings.push(`Vehicle rate is missing for ${pax} passengers.`);
      } else warnings.push(`Vehicle rule is missing for ${pax} passengers.`);

      const subtotal = hotelPaise + activityPaise + vehiclePaise;
      const adjustment = detail.price_adjustments.find(x => x.hotel_category_id === category.id);
      const adjusted = subtotal + Math.round(subtotal * (adjustment?.markup_bps ?? 0) / 10000) + (adjustment?.fixed_adjustment_paise ?? 0);
      const groupTotalPaise = Math.max(0, roundTo(adjusted, adjustment?.rounding_multiple_paise ?? 10000));
      cells.push({ pax, categoryId: category.id, categoryName: category.name, hotelPaise, activityPaise, vehiclePaise,
        adjustmentPaise: groupTotalPaise - subtotal, groupTotalPaise, perPersonPaise: Math.ceil(groupTotalPaise / pax), warnings, lines });
    }
  }
  return cells;
}

export function formatPackageMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}
