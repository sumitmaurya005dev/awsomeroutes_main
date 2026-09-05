import { z } from "zod";
import type { ItineraryInput } from "../../types/custom-itinerary";

const id = z.string().uuid();
const nullableId = id.nullable();
const text = (max: number) => z.string().trim().max(max);
const count = z.number().int().min(0).max(100);
const money = z.number().int().min(0).max(1_000_000_000);
const date = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Enter a valid date.",
  );
const override = {
  override_total_paise: money.nullable(),
  override_reason: text(500),
};
export const itinerarySchema = z
  .object({
    id,
    version: z.number().int().min(0),
    title: text(200).min(3),
    customer_name: text(150).min(2),
    customer_email: z.union([z.email(), z.literal("")]),
    customer_phone: text(40),
    travel_date: date,
    valid_until: date,
    adults: count.min(1),
    children: count,
    infants: count,
    luggage_count: count,
    source_package_id: nullableId,
    markup_bps: z.number().int().min(0).max(100000),
    discount_paise: money,
    total_override_paise: money.nullable().default(null),
    total_override_reason: text(500).default(""),
    advance_paise: money,
    show_hotel_cost: z.boolean(),
    show_activity_cost: z.boolean(),
    show_vehicle_cost: z.boolean(),
    public_notes: text(6000),
    internal_notes: text(6000),
    terms: text(12000),
    days: z
      .array(
        z.object({
          id,
          day_number: z.number().int().min(1).max(60),
          title: text(200).min(2),
          description: text(8000),
          start_location_id: nullableId,
          end_location_id: nullableId,
          overnight_location_id: nullableId,
          distance_km: z.number().min(0).max(5000).nullable(),
          travel_minutes: z.number().int().min(0).max(1440).nullable(),
          breakfast: z.boolean(),
          lunch: z.boolean(),
          dinner: z.boolean(),
          stays: z
            .array(
              z.object({
                id,
                hotel_id: id,
                room_id: nullableId,
                category_id: id,
                meal_plan: z.enum(["EP", "CP", "MAP", "AP"]),
                adults: count.min(1),
                children_with_bed: count,
                children_without_bed: count,
                infants: count,
                rooms: count.min(1),
                extra_adult_beds: count,
                ...override,
              }),
            )
            .max(20),
          activities: z
            .array(
              z.object({
                id,
                offering_id: id,
                variant_id: nullableId,
                adults: count,
                children: count,
                infants: count,
                quantity: z.number().int().min(1).max(20),
                units: z.number().int().min(1).max(100).nullable(),
                optional: z.boolean(),
                optional_charge_ids: z.array(id).max(30),
                ...override,
              }),
            )
            .max(30),
        }),
      )
      .max(60),
    transport: z
      .array(
        z.object({
          id,
          start_day: z.number().int().min(1).max(60),
          end_day: z.number().int().min(1).max(60),
          base_location_id: id,
          category_id: id,
          model_id: nullableId,
          vendor_id: nullableId,
          fleet_id: nullableId,
          driver_id: nullableId,
          quantity: z.number().int().min(1).max(20),
          luggage_only: z.boolean(),
          ...override,
        }),
      )
      .max(60),
  })
  .superRefine((v, ctx) => {
    if (v.total_override_paise !== null && !v.total_override_reason)
      ctx.addIssue({
        code: "custom",
        path: ["total_override_reason"],
        message: "Enter a reason for the final group price override.",
      });
    // Stay below Next's default 1 MB action limit, including transport overhead.
    if (new TextEncoder().encode(JSON.stringify(v)).length > 750_000)
      ctx.addIssue({
        code: "custom",
        message:
          "This draft is too large. Shorten long day descriptions or split the itinerary before saving.",
      });
    if (v.adults + v.children + v.infants > 100)
      ctx.addIssue({
        code: "custom",
        path: ["adults"],
        message: "Maximum group size is 100.",
      });
    const ids = new Set<string>();
    const addId = (value: string) => {
      if (ids.has(value))
        ctx.addIssue({
          code: "custom",
          message: "Duplicate itinerary item ID.",
        });
      ids.add(value);
    };
    for (const [index, day] of v.days.entries()) {
      addId(day.id);
      if (day.day_number !== index + 1)
        ctx.addIssue({
          code: "custom",
          path: ["days", index, "day_number"],
          message: "Days must be consecutively numbered.",
        });
      for (const item of [...day.stays, ...day.activities]) {
        addId(item.id);
        if (item.override_total_paise !== null && !item.override_reason)
          ctx.addIssue({
            code: "custom",
            message: "A reason is required for every price override.",
          });
      }
      if (day.stays.length && !day.overnight_location_id)
        ctx.addIssue({
          code: "custom",
          message: `Day ${index + 1}: select an overnight location before adding stays.`,
        });
      if (
        day.stays.reduce((sum, x) => sum + x.adults, 0) > v.adults ||
        day.stays.reduce(
          (sum, x) => sum + x.children_with_bed + x.children_without_bed,
          0,
        ) > v.children ||
        day.stays.reduce((sum, x) => sum + x.infants, 0) > v.infants
      )
        ctx.addIssue({
          code: "custom",
          message: `Day ${index + 1}: hotel guest allocation exceeds group size.`,
        });
      for (const a of day.activities)
        if (
          a.adults > v.adults ||
          a.children > v.children ||
          a.infants > v.infants ||
          a.adults + a.children + a.infants < 1
        )
          ctx.addIssue({
            code: "custom",
            message: `Day ${index + 1}: invalid activity participant allocation.`,
          });
    }
    for (const t of v.transport) {
      addId(t.id);
      if (t.start_day > t.end_day || t.end_day > v.days.length)
        ctx.addIssue({
          code: "custom",
          message: "Vehicle allocation must fit the itinerary days.",
        });
      if ((t.fleet_id || t.driver_id) && t.quantity !== 1)
        ctx.addIssue({
          code: "custom",
          message:
            "Assign a driver/fleet vehicle to one vehicle row at a time.",
        });
      if (t.override_total_paise !== null && !t.override_reason)
        ctx.addIssue({
          code: "custom",
          message: "A reason is required for every price override.",
        });
    }
  });
export function parseItinerary(value: unknown): ItineraryInput {
  return itinerarySchema.parse(value);
}
export function pricingSignature(v: ItineraryInput) {
  return JSON.stringify({
    markup: v.markup_bps,
    discount: v.discount_paise,
    totalOverride: v.total_override_paise ?? null,
    totalOverrideReason: v.total_override_reason ?? "",
    overrides: [
      ...v.days.flatMap((d) => [...d.stays, ...d.activities]),
      ...v.transport,
    ]
      .filter((x) => x.override_total_paise !== null)
      .map((x) => ({
        id: x.id,
        value: x.override_total_paise,
        reason: x.override_reason,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}
export function emptyItinerary(): ItineraryInput {
  return {
    id: crypto.randomUUID(),
    version: 0,
    title: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    travel_date: "",
    valid_until: "",
    adults: 2,
    children: 0,
    infants: 0,
    luggage_count: 2,
    source_package_id: null,
    markup_bps: 0,
    discount_paise: 0,
    total_override_paise: null,
    total_override_reason: "",
    advance_paise: 0,
    show_hotel_cost: false,
    show_activity_cost: false,
    show_vehicle_cost: true,
    public_notes: "",
    internal_notes: "",
    terms: "",
    days: [],
    transport: [],
  };
}
