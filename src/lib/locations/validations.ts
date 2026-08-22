import { z } from "zod";

export const locationSchema = z.object({
  destination_id: z.string().uuid("Please select a valid destination."),
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  location_type: z.enum(["place", "activity_spot", "attraction", "other"]),
  short_description: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  image_url: z.string().trim().url().nullable().optional(),
  image_asset_id: z.string().uuid().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
