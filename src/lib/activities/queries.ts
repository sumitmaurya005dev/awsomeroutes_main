import { createActivityDatabaseClient } from "./database";
import type {
  ActivityCategory,
  ActivityDetail,
  ActivityListItem,
  ActivityStatus,
} from "@/types/activity";

type ActivityFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ActivityStatus | "all";
  categoryId?: string;
};

export async function getActivities(filters: ActivityFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
  const from = (page - 1) * limit;
  const supabase = await createActivityDatabaseClient();
  let query = supabase
    .from("activities")
    .select(
      "id,name,slug,status,is_featured,created_at,category:activity_categories!inner(id,name,slug),featured_image:media_assets!activities_featured_image_asset_id_fkey(original_url,alt_text),activity_offerings(id)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (filters.status && filters.status !== "all")
    query = query.eq("status", filters.status);
  if (filters.categoryId && filters.categoryId !== "all")
    query = query.eq("category_id", filters.categoryId);
  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[%_,()]/g, "");
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Failed to load activities:", error);
    throw new Error("Failed to load activities.");
  }

  const rows = (data ?? []) as unknown as Array<
    Omit<ActivityListItem, "offering_count"> & {
      activity_offerings: { id: string }[];
    }
  >;
  return {
    data: rows.map(({ activity_offerings, ...activity }) => ({
      ...activity,
      offering_count: activity_offerings?.length ?? 0,
    })),
    count: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getActivityCategories() {
  const supabase = await createActivityDatabaseClient();
  const { data, error } = await supabase
    .from("activity_categories")
    .select("id,name,slug")
    .eq("status", "active")
    .order("display_order")
    .order("name");
  if (error) throw new Error("Failed to load activity categories.");
  return (data ?? []) as unknown as ActivityCategory[];
}

export async function getActivityById(
  id: string,
): Promise<ActivityDetail | null> {
  const supabase = await createActivityDatabaseClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `
      *,
      category:activity_categories!inner(id,name,slug),
      featured_image:media_assets!activities_featured_image_asset_id_fkey(id,original_url,file_name,alt_text),
      gallery:activity_media(id,media_asset_id,display_order,alt_text,caption,media_asset:media_assets(id,original_url,file_name,alt_text)),
      offerings:activity_offerings(
        *,
        location:locations(id,name,destination:destinations(id,name,region:regions(id,name,country:countries(id,name)))),
        variants:activity_variants(*),
        participant_prices:activity_participant_prices(*),
        charges:activity_charges(*),
        slots:activity_slots(*)
      ),
      faqs:activity_faqs(*)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load activity:", error);
    throw new Error("Failed to load activity.");
  }
  if (!data) return null;

  const activity = data as unknown as ActivityDetail;
  activity.gallery = [...(activity.gallery ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  activity.faqs = [...(activity.faqs ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  activity.offerings = [...(activity.offerings ?? [])].map((offering) => ({
    ...offering,
    variants: [...(offering.variants ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    ),
    participant_prices: [...(offering.participant_prices ?? [])],
    charges: [...(offering.charges ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    ),
    slots: [...(offering.slots ?? [])].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    ),
  }));
  return activity;
}
