"use server";

import { createRegion, deleteRegion } from "@/lib/regions/mutations";
import type { RegionFormValues } from "@/lib/regions/validations";

export async function createRegionAction(values: RegionFormValues) {
  return createRegion(values);
}

export async function deleteRegionAction(id: string) {
  return deleteRegion(id);
}
