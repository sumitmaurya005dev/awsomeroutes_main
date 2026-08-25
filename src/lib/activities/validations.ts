import { z } from "zod";

const nullableText = z.string().trim().max(10_000).nullable();
const nullablePositiveInteger = z.number().int().positive().nullable();
const nullableNonNegativeNumber = z.number().nonnegative().nullable();

export const activitySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(140)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and single hyphens only.",
      ),
    category_id: z.string().uuid(),
    short_description: z.string().trim().max(300).nullable(),
    description: nullableText,
    duration_minutes: nullablePositiveInteger,
    difficulty_level: z
      .enum(["easy", "moderate", "challenging", "extreme"])
      .nullable(),
    minimum_age: z.number().int().min(0).max(120).nullable(),
    maximum_age: z.number().int().min(0).max(120).nullable(),
    minimum_weight_kg: nullableNonNegativeNumber,
    maximum_weight_kg: nullableNonNegativeNumber,
    safety_information: nullableText,
    medical_restrictions: nullableText,
    what_to_carry: nullableText,
    inclusions: nullableText,
    exclusions: nullableText,
    highlights: nullableText,
    featured_image_asset_id: z.string().uuid().nullable(),
    gallery_asset_ids: z.array(z.string().uuid()).max(30),
    status: z.enum(["draft", "active", "temporarily_unavailable", "inactive"]),
    is_featured: z.boolean(),
    seo_title: z.string().trim().max(70).nullable(),
    seo_description: z.string().trim().max(170).nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.minimum_age !== null &&
      value.maximum_age !== null &&
      value.maximum_age < value.minimum_age
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_age"],
        message: "Maximum age must be greater than or equal to minimum age.",
      });
    }
    if (
      value.minimum_weight_kg !== null &&
      value.maximum_weight_kg !== null &&
      value.maximum_weight_kg < value.minimum_weight_kg
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_weight_kg"],
        message:
          "Maximum weight must be greater than or equal to minimum weight.",
      });
    }
  });

export const offeringSchema = z
  .object({
    activity_id: z.string().uuid(),
    location_id: z.string().uuid(),
    pricing_model: z.enum([
      "per_unit",
      "per_person",
      "per_group",
      "per_session",
    ]),
    base_price_paise: z.number().int().nonnegative(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("INR"),
    minimum_participants: z.number().int().positive(),
    maximum_participants_per_unit: nullablePositiveInteger,
    maximum_units_per_booking: nullablePositiveInteger,
    maximum_participants_per_booking: nullablePositiveInteger,
    minimum_billable_participants: z.number().int().positive(),
    duration_minutes: nullablePositiveInteger,
    tax_included: z.boolean(),
    tax_rate_bps: z.number().int().min(0).max(10_000),
    meeting_point: z.string().trim().max(500).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    reporting_instructions: z.string().trim().max(3000).nullable(),
    advance_booking_hours: z.number().int().nonnegative(),
    status: z.enum(["active", "temporarily_unavailable", "inactive"]),
  })
  .superRefine((value, context) => {
    if (
      value.pricing_model === "per_unit" &&
      value.maximum_participants_per_unit === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_participants_per_unit"],
        message: "Capacity per unit is required for per-unit pricing.",
      });
    }
    if (
      value.pricing_model !== "per_unit" &&
      value.maximum_participants_per_unit !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_participants_per_unit"],
        message: "Capacity per unit applies only to per-unit pricing.",
      });
    }
    if (
      value.pricing_model !== "per_unit" &&
      value.maximum_units_per_booking !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_units_per_booking"],
        message: "Maximum units applies only to per-unit pricing.",
      });
    }
    if (value.minimum_billable_participants < value.minimum_participants) {
      context.addIssue({
        code: "custom",
        path: ["minimum_billable_participants"],
        message:
          "Minimum billable participants cannot be lower than minimum participants.",
      });
    }
    if (
      value.maximum_participants_per_booking !== null &&
      value.maximum_participants_per_booking < value.minimum_participants
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_participants_per_booking"],
        message:
          "Maximum participants cannot be lower than minimum participants.",
      });
    }
  });

export const variantSchema = z.object({
  activity_offering_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable(),
  price_override_paise: z.number().int().nonnegative().nullable(),
  capacity_override: nullablePositiveInteger,
  duration_override_minutes: nullablePositiveInteger,
  display_order: z.number().int().nonnegative(),
  status: z.enum(["active", "inactive"]),
});

export const participantPriceSchema = z
  .object({
    activity_offering_id: z.string().uuid(),
    activity_variant_id: z.string().uuid().nullable(),
    participant_type: z.enum([
      "infant",
      "child",
      "adult",
      "senior",
      "participant",
    ]),
    minimum_age: z.number().int().min(0).max(120).nullable(),
    maximum_age: z.number().int().min(0).max(120).nullable(),
    price_paise: z.number().int().nonnegative(),
    capacity_count: z.number().min(0).max(10),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((value, context) => {
    if (
      value.minimum_age !== null &&
      value.maximum_age !== null &&
      value.maximum_age < value.minimum_age
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum_age"],
        message: "Maximum age must be greater than or equal to minimum age.",
      });
    }
  });

export const chargeSchema = z.object({
  activity_offering_id: z.string().uuid(),
  activity_variant_id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(120),
  calculation_type: z.enum([
    "per_person",
    "per_adult",
    "per_child",
    "per_unit",
    "per_booking",
    "fixed",
  ]),
  amount_paise: z.number().int().nonnegative(),
  mandatory: z.boolean(),
  taxable: z.boolean(),
  description: z.string().trim().max(500).nullable(),
  display_order: z.number().int().nonnegative(),
  status: z.enum(["active", "inactive"]),
});

export const slotSchema = z.object({
  activity_offering_id: z.string().uuid(),
  activity_variant_id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(80),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  price_override_paise: z.number().int().nonnegative().nullable(),
  capacity_override: nullablePositiveInteger,
  reporting_minutes_before: z.number().int().nonnegative(),
  status: z.enum(["active", "inactive"]),
});

export const faqSchema = z.object({
  activity_id: z.string().uuid(),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  display_order: z.number().int().nonnegative(),
  status: z.enum(["active", "inactive"]),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;
export type OfferingFormValues = z.infer<typeof offeringSchema>;
export type VariantFormValues = z.infer<typeof variantSchema>;
export type ParticipantPriceFormValues = z.infer<typeof participantPriceSchema>;
export type ChargeFormValues = z.infer<typeof chargeSchema>;
export type SlotFormValues = z.infer<typeof slotSchema>;
export type FaqFormValues = z.infer<typeof faqSchema>;
