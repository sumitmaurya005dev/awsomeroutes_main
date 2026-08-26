"use server";

import { getUserPermissions } from "@/lib/auth";
import { createVehicleDatabaseClient } from "./database";
import type { VehicleLocationOption } from "@/types/vehicle";

export async function searchVehicleLocations(search: string): Promise<VehicleLocationOption[]> {
  const permissions = await getUserPermissions();
  if (!permissions.some((permission) => permission.startsWith("vehicles."))) return [];
  const db = await createVehicleDatabaseClient();
  const term = search.trim().replace(/[%_,()]/g, "");
  let query = db
    .from("locations")
    .select("id,name,destination:destinations!inner(name,region:regions!inner(name,country:countries!inner(name)))")
    .eq("status", "active")
    .order("name")
    .limit(20);
  if (term) query = query.ilike("name", `%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error("Could not search locations.");
  return (data ?? []).map((row) => {
    const destination = row.destination as unknown as {
      name: string;
      region: { name: string; country: { name: string } };
    };
    return {
      id: String(row.id),
      name: String(row.name),
      destinationName: destination.name,
      regionName: destination.region.name,
      countryName: destination.region.country.name,
    };
  });
}
