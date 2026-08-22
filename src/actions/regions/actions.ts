"use server";

import { createRegion } from "@/lib/regions/mutations";
import type { RegionFormValues } from "@/lib/regions/validations";

export async function createRegionAction(values: RegionFormValues) {
  return createRegion(values);
}
