"use server";
import { getUserPermissions } from "@/lib/auth";
import { createHotelDatabaseClient } from "./database";
import type { HotelLocationOption } from "@/types/hotel";

const allowed = new Set([
  "hotels.view",
  "hotels.create",
  "hotels.update",
  "hotels.manage_pricing",
]);
export async function searchHotelLocations(
  raw: string,
): Promise<HotelLocationOption[]> {
  if (!(await getUserPermissions()).some((p) => allowed.has(p)))
    throw new Error("You do not have permission to browse hotel locations.");
  const search = raw
      .trim()
      .replace(/[%_,()]/g, " ")
      .slice(0, 100),
    db = await createHotelDatabaseClient();
  let query = db
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
  if (error) throw new Error("Locations could not be searched.");
  type Raw = {
    id: string;
    name: string;
    destination: {
      name: string;
      region: { name: string; country: { name: string } | null } | null;
    } | null;
  };
  return ((data ?? []) as unknown as Raw[]).map((x) => ({
    id: x.id,
    name: x.name,
    destinationName: x.destination?.name ?? "",
    regionName: x.destination?.region?.name ?? "",
    countryName: x.destination?.region?.country?.name ?? "",
  }));
}
