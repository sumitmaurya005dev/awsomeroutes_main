import { calculateActivityPrice } from "../activities/pricing.ts";
import {
  resolveVehicleDailyRate,
  calculateVehicleTotalPaise,
} from "../vehicles/pricing.ts";
import { resolveHotelRate } from "../hotels/pricing.ts";
import type {
  ItineraryInput,
  ItineraryReferences,
  ItineraryCalculation,
  QuoteLine,
} from "../../types/custom-itinerary";
export function calculateItinerary(
  v: ItineraryInput,
  refs: ItineraryReferences,
): ItineraryCalculation {
  const warnings: string[] = [],
    lines: QuoteLine[] = [];
  const locationName = (id: string | null) =>
    refs.locations.find((x) => x.id === id)?.name ?? "Location";
  const fail = (message: string) => {
    throw new Error(message);
  };
  const amount = (n: number) => {
    if (!Number.isSafeInteger(n) || n < 0)
      fail("Price is outside the supported range.");
    return n;
  };
  for (const day of v.days) {
    for (const stay of day.stays) {
      try {
        const hotel = refs.hotels.find((x) => x.id === stay.hotel_id);
        if (!hotel || hotel.status !== "active")
          fail("Select an active hotel.");
        const overnight = refs.locations.find(
          (x) => x.id === day.overnight_location_id,
        );
        const hotelLocation = refs.locations.find(
          (x) => x.id === hotel!.location_id,
        );
        if (
          !overnight ||
          !hotelLocation ||
          overnight.destination?.id !== hotelLocation.destination?.id
        )
          fail("Hotel must belong to the overnight destination.");
        const room = stay.room_id
          ? refs.rooms.find((x) => x.id === stay.room_id)
          : null;
        if (
          stay.room_id &&
          (!room ||
            room.hotel_id !== stay.hotel_id ||
            room.category_id !== stay.category_id ||
            room.status !== "active")
        )
          fail("Room does not match the selected hotel/category.");
        const rate = resolveHotelRate(
          refs.hotel_rates.filter((x) => x.status === "active"),
          hotel!.location_id,
          stay.category_id,
          stay.hotel_id,
          stay.room_id,
          stay.meal_plan,
        );
        if (!rate) fail("No matching active room, hotel or location rate.");
        const baseAdults = room?.base_adults ?? 2,
          maxBeds = room?.maximum_extra_beds ?? 2;
        if (stay.adults > stay.rooms * baseAdults + stay.extra_adult_beds)
          fail("Add rooms or adult extra beds for all allocated adults.");
        if (
          stay.extra_adult_beds + stay.children_with_bed >
          stay.rooms * maxBeds
        )
          fail("Extra beds exceed room capacity.");
        if (
          room &&
          (stay.adults > stay.rooms * room.maximum_adults ||
            stay.children_with_bed + stay.children_without_bed >
              stay.rooms * room.maximum_children ||
            stay.adults +
              stay.children_with_bed +
              stay.children_without_bed +
              stay.infants >
              stay.rooms * room.maximum_occupancy)
        )
          fail("Guests exceed the selected room occupancy limits.");
        if (
          stay.children_without_bed &&
          (!rate!.child_without_bed_allowed ||
            (room && !room.child_sharing_allowed) ||
            rate!.child_pricing_policy === "adult_rate")
        )
          fail("Child bed sharing is not allowed by this room/rate.");
        if (stay.children_with_bed && !rate!.child_with_bed_allowed)
          fail("Child extra bed is not allowed by this rate.");
        if (stay.infants && room && !room.infant_sharing_allowed)
          fail("Infant sharing is not allowed by this room.");
        const calculated =
          stay.rooms * rate!.base_room_rate_paise +
          stay.extra_adult_beds * rate!.extra_adult_bed_paise +
          stay.children_with_bed *
            (rate!.child_pricing_policy === "adult_rate"
              ? rate!.extra_adult_bed_paise
              : rate!.child_with_bed_paise) +
          stay.children_without_bed * rate!.child_without_bed_paise +
          stay.infants * rate!.infant_sharing_paise;
        lines.push({
          id: stay.id,
          day: day.day_number,
          kind: "hotel",
          label: hotel!.name,
          detail: `${room?.name ?? refs.hotel_categories.find((x) => x.id === stay.category_id)?.name ?? "Room"} · ${stay.meal_plan} · ${stay.rooms} room(s), ${stay.extra_adult_beds + stay.children_with_bed} extra bed(s)`,
          amount_paise: amount(stay.override_total_paise ?? calculated),
          optional: false,
          rate_id: rate!.id,
        });
      } catch (e) {
        warnings.push(
          `Day ${day.day_number} hotel: ${e instanceof Error ? e.message : "Invalid selection"}`,
        );
      }
    }
    if (
      day.overnight_location_id &&
      (day.stays.reduce((s, x) => s + x.adults, 0) !== v.adults ||
        day.stays.reduce(
          (s, x) => s + x.children_with_bed + x.children_without_bed,
          0,
        ) !== v.children ||
        day.stays.reduce((s, x) => s + x.infants, 0) !== v.infants)
    )
      warnings.push(
        `Day ${day.day_number}: allocate every guest to a hotel stay.`,
      );
    for (const a of day.activities) {
      try {
        const o = refs.activity_offerings.find((x) => x.id === a.offering_id);
        if (!o || o.status !== "active" || o.activity?.status !== "active")
          fail("Offering is inactive or unavailable.");
        const variant = a.variant_id
          ? o!.variants.find(
              (x) => x.id === a.variant_id && x.status === "active",
            )
          : null;
        if (a.variant_id && !variant)
          fail("Select an active variant of this offering.");
        const applicable = o!.charges.filter(
          (c) =>
            c.status === "active" &&
            (!c.activity_variant_id || c.activity_variant_id === a.variant_id),
        );
        if (
          a.optional_charge_ids.some(
            (id) => !applicable.some((c) => c.id === id),
          )
        )
          fail("An optional charge is unavailable for this variant.");
        const price = calculateActivityPrice({
          pricingModel: o!.pricing_model,
          basePricePaise: o!.base_price_paise,
          capacityPerUnit:
            variant?.capacity_override ?? o!.maximum_participants_per_unit,
          maximumUnitsPerBooking: o!.maximum_units_per_booking,
          maximumParticipantsPerBooking: o!.maximum_participants_per_booking,
          minimumParticipants: o!.minimum_participants,
          minimumBillableParticipants: o!.minimum_billable_participants,
          taxIncluded: o!.tax_included,
          taxRateBps: o!.tax_rate_bps,
          participants: {
            adult: a.adults,
            child: a.children,
            infant: a.infants,
          },
          participantPrices: o!.participant_prices,
          charges: applicable,
          variantId: a.variant_id,
          priceOverridePaise: variant?.price_override_paise,
          unitOverride: a.units ?? undefined,
          selectedOptionalChargeIds: a.optional_charge_ids,
        });
        lines.push({
          id: a.id,
          day: day.day_number,
          kind: "activity",
          label: o!.activity?.name ?? "Activity",
          detail: `${locationName(o!.location_id)} · ${variant?.name ?? "Base offering"} · ${a.adults + a.children + a.infants} guests · ${price.units} unit(s) × ${a.quantity}`,
          amount_paise: amount(
            a.override_total_paise ?? price.totalPaise * a.quantity,
          ),
          optional: a.optional,
          rate_id: o!.id,
        });
      } catch (e) {
        warnings.push(
          `Day ${day.day_number} activity: ${e instanceof Error ? e.message : "Invalid selection"}`,
        );
      }
    }
  }
  for (const t of v.transport) {
    try {
      const category = refs.full_vehicle_categories.find(
        (x) => x.id === t.category_id && x.status === "active",
      );
      const model = t.model_id
        ? refs.full_vehicle_models.find(
            (x) => x.id === t.model_id && x.status === "active",
          )
        : null;
      if (
        !category ||
        (t.model_id && (!model || model.category_id !== t.category_id))
      )
        fail("Vehicle model/category is unavailable or mismatched.");
      if (!refs.locations.some((x) => x.id === t.base_location_id))
        fail("Vehicle base location is unavailable.");
      if (
        t.vendor_id &&
        !refs.vehicle_vendors.some(
          (x) =>
            x.id === t.vendor_id && x.base_location_id === t.base_location_id,
        )
      )
        fail("Vendor must serve the selected base location.");
      const fleet = t.fleet_id
        ? refs.fleet.find((x) => x.id === t.fleet_id)
        : null;
      const driver = t.driver_id
        ? refs.drivers.find((x) => x.id === t.driver_id)
        : null;
      if (
        t.fleet_id &&
        (!fleet ||
          fleet.status !== "active" ||
          fleet.model_id !== t.model_id ||
          fleet.vendor_id !== t.vendor_id)
      )
        fail("Fleet vehicle does not match the model/vendor.");
      if (
        t.driver_id &&
        (!driver ||
          driver.status !== "active" ||
          driver.vendor_id !== t.vendor_id)
      )
        fail("Driver does not match the vendor.");
      if (
        driver?.licence_expiry &&
        v.travel_date &&
        driver.licence_expiry <
          new Date(Date.parse(v.travel_date) + (t.end_day - 1) * 86400000)
            .toISOString()
            .slice(0, 10)
      )
        fail("Driver licence expires before this allocation ends.");
      for (const other of v.transport)
        if (
          other.id !== t.id &&
          other.start_day <= t.end_day &&
          other.end_day >= t.start_day &&
          ((t.fleet_id && other.fleet_id === t.fleet_id) ||
            (t.driver_id && other.driver_id === t.driver_id))
        )
          fail("Driver/fleet is assigned twice on overlapping days.");
      const rate = resolveVehicleDailyRate(
        refs.vehicle_rates.filter(
          (x) =>
            x.base_location_id === t.base_location_id &&
            x.category_id === t.category_id,
        ),
        { modelId: t.model_id, vendorId: t.vendor_id },
      );
      if (!rate) fail("No active vehicle rate for the base location.");
      lines.push({
        id: t.id,
        day: t.start_day,
        kind: "vehicle",
        label: `${t.quantity} × ${model?.name ?? category!.name}`,
        detail: `Day ${t.start_day}–${t.end_day} · ${locationName(t.base_location_id)} base${t.luggage_only ? " · luggage only" : ""}${fleet ? " · " + fleet.registration_number : ""}${driver ? " · driver " + driver.first_name + " " + (driver.last_name ?? "") : ""}`,
        amount_paise: amount(
          t.override_total_paise ??
            calculateVehicleTotalPaise({
              dailyRatePaise: rate!.daily_rate_paise,
              days: t.end_day - t.start_day + 1,
              quantity: t.quantity,
            }),
        ),
        optional: false,
        rate_id: "id" in rate! ? String(rate!.id) : null,
      });
    } catch (e) {
      warnings.push(
        `Vehicle: ${e instanceof Error ? e.message : "Invalid selection"}`,
      );
    }
  }
  for (const day of v.days) {
    const transport = v.transport.filter(
      (t) => t.start_day <= day.day_number && t.end_day >= day.day_number,
    );
    let seats = 0,
      comfort = 0,
      luggage = 0;
    for (const t of transport) {
      const c = refs.full_vehicle_categories.find(
          (x) => x.id === t.category_id,
        ),
        m = refs.full_vehicle_models.find((x) => x.id === t.model_id),
        f = refs.fleet.find((x) => x.id === t.fleet_id);
      if (!t.luggage_only) {
        seats +=
          t.quantity *
          (f?.seating_capacity ??
            m?.seating_capacity ??
            c?.default_seating_capacity ??
            0);
        comfort +=
          t.quantity *
          (f?.comfort_capacity ??
            m?.comfort_capacity ??
            c?.default_comfort_capacity ??
            0);
      }
      luggage +=
        t.quantity *
        (f?.luggage_capacity ??
          m?.luggage_capacity ??
          c?.default_luggage_capacity ??
          0);
    }
    if (transport.length && seats < v.adults + v.children + v.infants)
      warnings.push(
        `Day ${day.day_number}: assigned vehicles do not have enough passenger seats.`,
      );
    if (transport.length && comfort < v.adults + v.children + v.infants)
      warnings.push(
        `Day ${day.day_number}: comfort capacity is below group size; add a vehicle or choose a larger model.`,
      );
    if (transport.length && luggage < v.luggage_count)
      warnings.push(`Day ${day.day_number}: luggage capacity is insufficient.`);
  }
  const total = (kind: QuoteLine["kind"]) =>
    lines
      .filter((x) => x.kind === kind && !x.optional)
      .reduce((s, x) => s + x.amount_paise, 0);
  const hotel_paise = total("hotel"),
    activity_paise = total("activity"),
    vehicle_paise = total("vehicle"),
    subtotal_paise = amount(hotel_paise + activity_paise + vehicle_paise);
  const markup_paise = amount(
    Math.round((subtotal_paise * v.markup_bps) / 10000),
  );
  if (v.discount_paise > subtotal_paise + markup_paise)
    warnings.push("Discount exceeds the group total.");
  const calculated_total_paise = amount(
    Math.max(0, subtotal_paise + markup_paise - v.discount_paise),
  );
  const total_paise = amount(v.total_override_paise ?? calculated_total_paise);
  if (v.advance_paise > total_paise)
    warnings.push("Advance cannot exceed the group total.");
  return {
    hotel_paise,
    activity_paise,
    vehicle_paise,
    subtotal_paise,
    calculated_total_paise,
    markup_paise,
    discount_paise: v.discount_paise,
    total_paise,
    advance_paise: v.advance_paise,
    balance_paise: Math.max(0, total_paise - v.advance_paise),
    warnings: [...new Set(warnings)],
    lines,
  };
}
