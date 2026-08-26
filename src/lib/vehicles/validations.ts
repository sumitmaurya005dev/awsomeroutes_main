import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const status = z.enum(["active", "inactive"]);
const slug = z.string().trim().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const capacity = z.number().int().min(1).max(60);

export const vehicleCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  description: nullableText(1000),
  default_seating_capacity: capacity,
  default_comfort_capacity: capacity,
  default_luggage_capacity: z.number().int().min(0).max(100),
  status,
}).refine((value) => value.default_comfort_capacity <= value.default_seating_capacity, {
  path: ["default_comfort_capacity"],
  message: "Comfort capacity cannot exceed maximum seating capacity.",
});

export const vehicleModelSchema = z.object({
  category_id: z.string().uuid(),
  manufacturer: nullableText(100),
  name: z.string().trim().min(2).max(120),
  slug,
  description: nullableText(2000),
  seating_capacity: capacity,
  comfort_capacity: capacity,
  luggage_capacity: z.number().int().min(0).max(100),
  status,
}).refine((value) => value.comfort_capacity <= value.seating_capacity, {
  path: ["comfort_capacity"],
  message: "Comfort capacity cannot exceed maximum seating capacity.",
});

export const transportVendorSchema = z.object({
  base_location_id: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug,
  contact_person: nullableText(160),
  phone: nullableText(40),
  alternate_phone: nullableText(40),
  email: z.string().trim().email().max(254).nullable(),
  address: nullableText(1000),
  notes: nullableText(3000),
  status,
});

export const driverSchema = z.object({
  vendor_id: z.string().uuid().nullable(),
  first_name: z.string().trim().min(1).max(100),
  last_name: nullableText(100),
  phone: z.string().trim().min(7).max(40),
  alternate_phone: nullableText(40),
  licence_number: nullableText(80),
  licence_expiry: z.string().date().nullable(),
  notes: nullableText(2000),
  status: z.enum(["active", "inactive", "unavailable"]),
});

export const fleetVehicleSchema = z.object({
  vendor_id: z.string().uuid().nullable(),
  model_id: z.string().uuid(),
  registration_number: z.string().trim().min(4).max(30).transform((v) => v.toUpperCase()),
  color: nullableText(60),
  manufacture_year: z.number().int().min(1980).max(2200).nullable(),
  seating_capacity: z.number().int().min(1).max(60).nullable(),
  comfort_capacity: z.number().int().min(1).max(60).nullable(),
  luggage_capacity: z.number().int().min(0).max(100).nullable(),
  notes: nullableText(2000),
  status: z.enum(["active", "inactive", "maintenance"]),
}).refine(
  (value) => !value.comfort_capacity || !value.seating_capacity || value.comfort_capacity <= value.seating_capacity,
  { path: ["comfort_capacity"], message: "Comfort capacity cannot exceed maximum seating capacity." },
);

export const vehicleRateSchema = z.object({
  base_location_id: z.string().uuid(),
  category_id: z.string().uuid(),
  model_id: z.string().uuid().nullable(),
  vendor_id: z.string().uuid().nullable(),
  daily_rate_paise: z.number().int().min(0).max(100_000_000_000),
  currency: z.literal("INR"),
  all_inclusive: z.literal(true),
  notes: nullableText(2000),
  status,
});

export type VehicleCategoryValues = z.infer<typeof vehicleCategorySchema>;
export type VehicleModelValues = z.infer<typeof vehicleModelSchema>;
export type TransportVendorValues = z.infer<typeof transportVendorSchema>;
export type DriverValues = z.infer<typeof driverSchema>;
export type FleetVehicleValues = z.infer<typeof fleetVehicleSchema>;
export type VehicleRateValues = z.infer<typeof vehicleRateSchema>;
