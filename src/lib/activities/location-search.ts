"use server";

import { getUserPermissions } from "@/lib/auth";
import { createActivityDatabaseClient } from "./database";
import type { ActivityLocationOption } from "@/types/activity";

const LOCATION_SEARCH_PERMISSIONS = new Set([
  "activities.view",
  "activities.create",
  "activities.update",
  "activities.manage_pricing",
]);

export async function searchActivityLocations(
  rawSearch: string,
): Promise<ActivityLocationOption[]> {
  const permissions = await getUserPermissions();
  if (
    !permissions.some((permission) =>
      LOCATION_SEARCH_PERMISSIONS.has(permission),
    )
  ) {
    throw new Error("You do not have permission to browse activity locations.");
  }

  const search = rawSearch
    .trim()
    .replace(/[%_,()]/g, " ")
    .slice(0, 100);
  const supabase = await createActivityDatabaseClient();
  let query = supabase
    .from("locations")
    .select(
      "id,name,destination:destinations!inner(id,name,status,region:regions!inner(id,name,status,country:countries!inner(id,name,status)))",
    )
    .eq("status", "active")
    .eq("destination.status", "active")
    .eq("destination.region.status", "active")
    .eq("destination.region.country.status", "active")
    .order("name")
    .limit(30);

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error("Activity location search failed:", error);
    throw new Error("Locations could not be searched.");
  }

  type RawLocation = {
    id: string;
    name: string;
    destination: {
      name: string;
      region: { name: string; country: { name: string } | null } | null;
    } | null;
  };

  return ((data ?? []) as unknown as RawLocation[]).map((location) => ({
    id: location.id,
    name: location.name,
    destinationName: location.destination?.name ?? "",
    regionName: location.destination?.region?.name ?? "",
    countryName: location.destination?.region?.country?.name ?? "",
  }));
}
