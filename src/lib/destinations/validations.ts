import { z } from "zod";

const optionalUrl = z.string().trim().url().nullable().optional();
const optionalUuid = z.string().uuid().nullable().optional();

export const destinationSchema = z.object({
  region_id: z.string().uuid("Please select a valid region."),
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  short_description: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  image_url: optionalUrl,
  image_asset_id: optionalUuid,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type DestinationFormValues = z.infer<typeof destinationSchema>;
