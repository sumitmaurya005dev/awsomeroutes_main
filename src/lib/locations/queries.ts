import { createClient } from "@/lib/supabase/server";
import type { LocationWithDestination } from "@/types/location";

export async function getLocations({ page = 1, limit = 50, search = "", status = "all", destinationId = "" }: { page?: number; limit?: number; search?: string; status?: "active" | "inactive" | "all"; destinationId?: string } = {}) {
  const supabase = await createClient();
  const safePage = Math.max(1, page); const safeLimit = Math.min(Math.max(1, limit), 100); const from = (safePage - 1) * safeLimit;
  let query = supabase.from("locations").select("*, destination:destinations(id,name,slug,region:regions(id,name))", { count: "exact" });
  if (status !== "all") query = query.eq("status", status);
  if (destinationId) query = query.eq("destination_id", destinationId);
  if (search.trim()) query = query.or(`name.ilike.%${search.trim().replace(/[,()%_]/g, "")}% ,slug.ilike.%${search.trim().replace(/[,()%_]/g, "")}%`.replace("% ,", "%,"));
  const { data, error, count } = await query.order("name").order("id").range(from, from + safeLimit - 1);
  if (error) throw new Error("Failed to fetch locations.");
  return { data: (data ?? []) as LocationWithDestination[], count: count ?? 0, page: safePage, limit: safeLimit, totalPages: Math.ceil((count ?? 0) / safeLimit) };
}

export async function getActiveDestinations() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("destinations").select("id,name,region:regions(name)").eq("status", "active").order("name");
  if (error) throw new Error("Failed to load destinations.");
  return data ?? [];
}
