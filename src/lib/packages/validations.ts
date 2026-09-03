import { z } from "zod";

const uuid = z.string().uuid();
const nullableUuid = uuid.nullable();
const nullableText = (max: number) => z.string().trim().max(max).nullable();
const order = z.number().int().min(0).max(500);

export const packageSchema = z.object({
  primary_destination_id: uuid, start_location_id: nullableUuid, end_location_id: nullableUuid,
  name: z.string().trim().min(3).max(180),
  slug: z.string().trim().max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  package_code: nullableText(40), short_description: nullableText(500), description: nullableText(30000),
  duration_days: z.number().int().min(1).max(90), duration_nights: z.number().int().min(0).max(90),
  featured_image_asset_id: nullableUuid, gallery_asset_ids: z.array(uuid).max(100), destination_ids: z.array(uuid).max(50),
  is_featured: z.boolean(), status: z.enum(["draft", "published", "inactive", "archived"]),
  apply_content_defaults: z.boolean().default(true),
  seo_title: nullableText(70), seo_description: nullableText(170),
}).refine(v => v.duration_nights <= v.duration_days, { path: ["duration_nights"], message: "Nights cannot exceed days." });

export const packageDaySchema = z.object({
  package_id: uuid, day_number: z.number().int().min(1).max(90), title: z.string().trim().min(2).max(180),
  summary: nullableText(500), description: nullableText(20000), start_location_id: nullableUuid, end_location_id: nullableUuid,
  overnight_location_id: nullableUuid, distance_km: z.number().min(0).max(10000).nullable(), travel_minutes: z.number().int().min(0).max(43200).nullable(),
  vehicle_required: z.boolean(), breakfast_included: z.boolean(), lunch_included: z.boolean(), dinner_included: z.boolean(), notes: nullableText(3000),
});
export const packageActivitySchema = z.object({ itinerary_day_id: uuid, activity_offering_id: uuid, activity_variant_id: nullableUuid, quantity: z.number().int().min(1).max(100), is_optional: z.boolean(), notes: nullableText(2000), display_order: order });
export const packageHotelSchema = z.object({ itinerary_day_id: uuid, hotel_category_id: uuid, hotel_id: uuid, hotel_room_id: nullableUuid, meal_plan: z.enum(["EP","CP","MAP","AP"]), is_primary: z.boolean(), notes: nullableText(2000), display_order: order });
export const packageVehicleSchema = z.object({ package_id: uuid, minimum_pax: z.number().int().min(1).max(100), maximum_pax: z.number().int().min(1).max(100), base_location_id: uuid, vehicle_category_id: uuid, vehicle_model_id: nullableUuid, vendor_id: nullableUuid, quantity: z.number().int().min(1).max(20), billable_days: z.number().int().min(1).max(90), notes: nullableText(2000), display_order: order }).refine(v => v.maximum_pax >= v.minimum_pax, { path: ["maximum_pax"], message: "Maximum passengers must be at least minimum passengers." });
export const packageContentTypeSchema = z.enum(["highlight","inclusion","exclusion","important_note","terms","cancellation","reschedule","value_promise"]);
export const packageContentSchema = z.object({ package_id: uuid, item_type: packageContentTypeSchema, section_title: z.string().trim().min(2).max(160), content: z.string().trim().min(1).max(3000), display_order: order });
export const packageContentTemplateSchema = z.object({ name: z.string().trim().min(3).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), version: z.number().int().min(1).max(10000), status: z.enum(["draft","active","archived"]), notes: nullableText(2000) });
export const packageContentTemplateSectionSchema = z.object({ template_id: uuid, section_type: packageContentTypeSchema, title: z.string().trim().min(2).max(160), display_order: order });
export const packageContentTemplateItemSchema = z.object({ section_id: uuid, content: z.string().trim().min(1).max(3000), display_order: order, status: z.enum(["active","inactive"]) });
export const packageFaqSchema = z.object({ package_id: uuid, question: z.string().trim().min(3).max(500), answer: z.string().trim().min(3).max(5000), display_order: order });
export const packageAdjustmentSchema = z.object({ package_id: uuid, hotel_category_id: uuid, markup_bps: z.number().int().min(-10000).max(100000), fixed_adjustment_paise: z.number().int().min(-100000000000).max(100000000000), rounding_multiple_paise: z.number().int().min(1).max(1000000), notes: nullableText(2000) });

export type PackageValues = z.infer<typeof packageSchema>;
export type PackageDayValues = z.infer<typeof packageDaySchema>;
export type PackageActivityValues = z.infer<typeof packageActivitySchema>;
export type PackageHotelValues = z.infer<typeof packageHotelSchema>;
export type PackageVehicleValues = z.infer<typeof packageVehicleSchema>;
export type PackageContentValues = z.infer<typeof packageContentSchema>;
export type PackageContentTemplateValues = z.infer<typeof packageContentTemplateSchema>;
export type PackageContentTemplateSectionValues = z.infer<typeof packageContentTemplateSectionSchema>;
export type PackageContentTemplateItemValues = z.infer<typeof packageContentTemplateItemSchema>;
export type PackageFaqValues = z.infer<typeof packageFaqSchema>;
export type PackageAdjustmentValues = z.infer<typeof packageAdjustmentSchema>;
