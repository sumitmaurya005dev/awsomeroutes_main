import { z } from "zod";

// ---------------------------------------------
// Country Status
// ---------------------------------------------

export const countryStatusSchema = z.enum([
  "active",
  "inactive",
]);

// ---------------------------------------------
// Create Country Validation
// ---------------------------------------------

export const createCountrySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Country name must be at least 2 characters")
    .max(100, "Country name must not exceed 100 characters"),

  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(120, "Slug must not exceed 120 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers and hyphens"
    ),

  iso_code: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "ISO code must be exactly 2 characters")
    .regex(
      /^[A-Z]{2}$/,
      "ISO code must contain only letters"
    )
    .nullable()
    .optional(),

  phone_code: z
    .string()
    .trim()
    .regex(
      /^\+[1-9][0-9]{0,3}$/,
      "Enter a valid phone code, e.g. +91"
    )
    .nullable()
    .optional(),

  description: z
    .string()
    .trim()
    .max(
      1000,
      "Description must not exceed 1000 characters"
    )
    .nullable()
    .optional(),

  image_url: z
    .string()
    .trim()
    .url("Please enter a valid image URL")
    .nullable()
    .optional(),

  status: countryStatusSchema.default("active"),
});

// ---------------------------------------------
// Update Country Validation
// ---------------------------------------------

export const updateCountrySchema =
  createCountrySchema.partial();

// ---------------------------------------------
// Update Country With ID
// ---------------------------------------------

export const updateCountryWithIdSchema =
  updateCountrySchema.extend({
    id: z.string().uuid("Invalid country ID"),
  });

// ---------------------------------------------
// Types
// ---------------------------------------------

export type CreateCountryInput = z.infer<
  typeof createCountrySchema
>;

export type UpdateCountryInput = z.infer<
  typeof updateCountrySchema
>;

export type UpdateCountryWithIdInput = z.infer<
  typeof updateCountryWithIdSchema
>;