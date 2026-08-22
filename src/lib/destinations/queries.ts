import { createClient } from "@/lib/supabase/server";
import type { DestinationWithRegion } from "@/types/destination";

export async function getDestinations({ page = 1, limit = 50, search = "", status = "all", regionId = "" }: { page?: number; limit?: number; search?: string; status?: "active" | "inactive" | "all"; regionId?: string } = {}) {
  const supabase = await createClient();
  const safePage = Math.max(1, page); const safeLimit = Math.min(Math.max(1, limit), 100); const from = (safePage - 1) * safeLimit;
  let query = supabase.from("destinations").select("*, region:regions(id,name,slug,country:countries(id,name))", { count: "exact" });
  if (status !== "all") query = query.eq("status", status);
  if (regionId) query = query.eq("region_id", regionId);
  if (search.trim()) query = query.or(`name.ilike.%${search.trim().replace(/[,()%_]/g, "")}% ,slug.ilike.%${search.trim().replace(/[,()%_]/g, "")}%`.replace("% ,", "%,"));
  const { data, error, count } = await query.order("name").order("id").range(from, from + safeLimit - 1);
  if (error) throw new Error("Failed to fetch destinations.");
  return { data: (data ?? []) as DestinationWithRegion[], count: count ?? 0, page: safePage, limit: safeLimit, totalPages: Math.ceil((count ?? 0) / safeLimit) };
}

export async function getActiveRegions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("regions").select("id,name,country:countries(name)").eq("status", "active").order("name");
  if (error) throw new Error("Failed to load regions.");
  return data ?? [];
}
