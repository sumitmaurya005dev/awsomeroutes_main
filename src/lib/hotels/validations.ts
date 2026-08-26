import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullablePositive = z.number().positive().nullable();

export function isAllowedHotelWebsiteUrl(value: string) {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}

const nullableHttpUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine(
    isAllowedHotelWebsiteUrl,
    "Website URL must use http:// or https://.",
  )
  .nullable();

export const hotelSchema = z.object({
  location_id: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180),
  short_description: nullableText(350),
  description: nullableText(20_000),
  address: nullableText(1000),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  phone: nullableText(40),
  email: z.string().email().max(254).nullable(),
  website_url: nullableHttpUrl,
  star_rating: z.number().min(0).max(5).nullable(),
  check_in_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  check_out_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  policies: nullableText(10_000),
  featured_image_asset_id: z.string().uuid().nullable(),
  gallery_asset_ids: z.array(z.string().uuid()).max(40),
  amenity_ids: z.array(z.string().uuid()).max(100),
  status: z.enum(["draft", "active", "temporarily_unavailable", "inactive"]),
  is_featured: z.boolean(),
  seo_title: nullableText(70),
  seo_description: nullableText(170),
});

export const hotelRoomSchema = z
  .object({
    hotel_id: z.string().uuid(),
    category_id: z.string().uuid(),
    name: z.string().trim().min(2).max(140),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
    description: nullableText(5000),
    bed_type: nullableText(120),
    room_size_sqft: nullablePositive,
    base_adults: z.number().int().positive().max(20),
    maximum_adults: z.number().int().positive().max(20),
    maximum_children: z.number().int().nonnegative().max(20),
    maximum_occupancy: z.number().int().positive().max(30),
    maximum_extra_beds: z.number().int().nonnegative().max(10),
    child_sharing_allowed: z.boolean(),
    infant_sharing_allowed: z.boolean(),
    inventory_count: z.number().int().nonnegative().nullable(),
    featured_image_asset_id: z.string().uuid().nullable(),
    gallery_asset_ids: z.array(z.string().uuid()).max(20),
    display_order: z.number().int().nonnegative(),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((v, ctx) => {
    if (v.maximum_adults < v.base_adults)
      ctx.addIssue({
        code: "custom",
        path: ["maximum_adults"],
        message: "Maximum adults cannot be lower than base adults.",
      });
    if (v.maximum_occupancy < v.maximum_adults)
      ctx.addIssue({
        code: "custom",
        path: ["maximum_occupancy"],
        message: "Maximum occupancy cannot be lower than maximum adults.",
      });
  });

export const hotelRateSchema = z
  .object({
    location_id: z.string().uuid(),
    category_id: z.string().uuid(),
    hotel_id: z.string().uuid().nullable(),
    room_id: z.string().uuid().nullable(),
    meal_plan: z.enum(["EP", "CP", "MAP", "AP"]),
    base_room_rate_paise: z.number().int().nonnegative(),
    extra_adult_bed_paise: z.number().int().nonnegative(),
    child_with_bed_paise: z.number().int().nonnegative(),
    child_without_bed_paise: z.number().int().nonnegative(),
    infant_sharing_paise: z.number().int().nonnegative(),
    child_pricing_policy: z.enum(["child_rates", "adult_rate"]),
    child_with_bed_allowed: z.boolean(),
    child_without_bed_allowed: z.boolean(),
    currency: z.literal("INR"),
    tax_included: z.literal(true),
    notes: nullableText(1000),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((v, ctx) => {
    if (v.room_id && !v.hotel_id)
      ctx.addIssue({
        code: "custom",
        path: ["room_id"],
        message: "Room override requires a hotel.",
      });
    if (v.child_pricing_policy === "adult_rate" && v.child_without_bed_allowed)
      ctx.addIssue({
        code: "custom",
        path: ["child_without_bed_allowed"],
        message: "Adult-rate child policy cannot allow parent sharing.",
      });
  });

export type HotelValues = z.infer<typeof hotelSchema>;
export type HotelRoomValues = z.infer<typeof hotelRoomSchema>;
export type HotelRateValues = z.infer<typeof hotelRateSchema>;
