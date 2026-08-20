import { z } from "zod";

export const regionStatusSchema = z.enum([
  "active",
  "inactive",
]);

export const regionSchema = z.object({
  country_id: z
    .string()
    .uuid("Please select a valid country."),

  name: z
    .string()
    .trim()
    .min(2, "Region name must be at least 2 characters.")
    .max(
      100,
      "Region name must not exceed 100 characters."
    ),

  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(
      120,
      "Slug must not exceed 120 characters."
    )
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens."
    ),

  description: z
    .string()
    .trim()
    .max(
      2000,
      "Description must not exceed 2000 characters."
    )
    .nullable()
    .optional(),

  image_url: z
    .string()
    .trim()
    .url("Please provide a valid image URL.")
    .nullable()
    .optional(),

  status: regionStatusSchema.default("active"),
});

export type RegionFormValues = z.infer<
  typeof regionSchema
>;

