"use server";
import { createLocation, updateLocation } from "@/lib/locations/mutations";
import type { LocationFormValues } from "@/lib/locations/validations";
export async function createLocationAction(values: LocationFormValues) { return createLocation(values); }
export async function updateLocationAction(id: string, values: LocationFormValues) { return updateLocation(id, values); }
