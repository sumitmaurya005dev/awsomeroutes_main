import { createHotelDatabaseClient } from "./database";
import type {
  HotelAmenity,
  HotelCategory,
  HotelDetail,
  HotelLocationRate,
  HotelListItem,
  HotelPricingLocation,
  HotelStatus,
} from "@/types/hotel";

export async function getHotelLocationRates(filters: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive" | "all";
  locationId?: string;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
  const from = (page - 1) * limit;
  const db = await createHotelDatabaseClient();

  let matchingLocationIds: string[] | null = null;
  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[%_,()]/g, "");
    const { data, error } = await db
      .from("locations")
      .select("id")
      .ilike("name", `%${search}%`)
      .limit(1000);
    if (error) throw new Error("Failed to search hotel pricing locations.");
    matchingLocationIds = (data ?? []).map((item) => item.id);
  }

  let query = db
    .from("hotel_rate_cards")
    .select(
      "*,category:hotel_categories(id,name,slug),location:locations(id,name,destination:destinations(name,region:regions(name)))",
      { count: "exact" },
    )
    .is("hotel_id", null)
    .is("room_id", null)
    .order("location_id")
    .order("category_id")
    .order("meal_plan")
    .range(from, from + limit - 1);

  if (filters.status && filters.status !== "all")
    query = query.eq("status", filters.status);
  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (matchingLocationIds) {
    if (!matchingLocationIds.length)
      return { data: [] as HotelLocationRate[], count: 0, page, limit, totalPages: 1 };
    query = query.in("location_id", matchingLocationIds);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Load hotel location rates failed:", error);
    throw new Error("Failed to load location pricing.");
  }
  return {
    data: (data ?? []) as unknown as HotelLocationRate[],
    count: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getHotelLocationPricingReferences() {
  const db = await createHotelDatabaseClient();
  const [locations, categories] = await Promise.all([
    db
      .from("locations")
      .select("id,name,destination:destinations(name,region:regions(name))")
      .eq("status", "active")
      .order("name")
      .limit(5000),
    db
      .from("hotel_categories")
      .select("id,name,slug")
      .eq("status", "active")
      .order("display_order")
      .order("name"),
  ]);
  if (locations.error || categories.error)
    throw new Error("Failed to load location pricing references.");
  return {
    locations: (locations.data ?? []) as unknown as HotelPricingLocation[],
    categories: (categories.data ?? []) as unknown as HotelCategory[],
  };
}

export async function getHotels(
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: HotelStatus | "all";
  } = {},
) {
  const page = Math.max(1, filters.page ?? 1),
    limit = Math.min(100, Math.max(1, filters.limit ?? 25)),
    from = (page - 1) * limit;
  const db = await createHotelDatabaseClient();
  let query = db
    .from("hotels")
    .select(
      "id,name,slug,status,is_featured,star_rating,created_at,location:locations!inner(id,name,destination:destinations(name)),featured_image:media_assets!hotels_featured_image_asset_id_fkey(original_url,alt_text),hotel_rooms(id)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);
  if (filters.status && filters.status !== "all")
    query = query.eq("status", filters.status);
  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[%_,()]/g, "");
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }
  const { data, error, count } = await query;
  if (error) {
    console.error("Load hotels failed:", error);
    throw new Error("Failed to load hotels.");
  }
  const rows = (data ?? []) as unknown as Array<
    Omit<HotelListItem, "room_count"> & { hotel_rooms: { id: string }[] }
  >;
  return {
    data: rows.map(({ hotel_rooms, ...hotel }) => ({
      ...hotel,
      room_count: hotel_rooms?.length ?? 0,
    })),
    count: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getHotelReferenceData() {
  const db = await createHotelDatabaseClient();
  const [categories, amenities] = await Promise.all([
    db
      .from("hotel_categories")
      .select("id,name,slug")
      .eq("status", "active")
      .order("display_order")
      .order("name"),
    db
      .from("hotel_amenities")
      .select("id,name,slug")
      .eq("status", "active")
      .order("display_order")
      .order("name"),
  ]);
  if (categories.error || amenities.error)
    throw new Error("Failed to load hotel reference data.");
  return {
    categories: (categories.data ?? []) as unknown as HotelCategory[],
    amenities: (amenities.data ?? []) as unknown as HotelAmenity[],
  };
}

export async function getHotelById(id: string): Promise<HotelDetail | null> {
  const db = await createHotelDatabaseClient();
  const { data, error } = await db
    .from("hotels")
    .select(
      `*,location:locations(id,name,destination:destinations(id,name,region:regions(id,name,country:countries(id,name)))),featured_image:media_assets!hotels_featured_image_asset_id_fkey(id,original_url,file_name,alt_text),gallery:hotel_media(id,media_asset_id,display_order,media_asset:media_assets(id,original_url,file_name,alt_text)),amenities:hotel_amenity_assignments(amenity_id,amenity:hotel_amenities(id,name,slug)),rooms:hotel_rooms(*,category:hotel_categories(id,name,slug),featured_image:media_assets!hotel_rooms_featured_image_asset_id_fkey(id,original_url,file_name,alt_text),gallery:hotel_room_media(id,media_asset_id,display_order,media_asset:media_assets(id,original_url,file_name,alt_text)))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Load hotel failed:", error);
    throw new Error("Failed to load hotel.");
  }
  if (!data) return null;
  const hotel = data as unknown as HotelDetail;
  const rates = await db
    .from("hotel_rate_cards")
    .select("*,category:hotel_categories(id,name,slug)")
    .eq("location_id", hotel.location_id)
    .or(`hotel_id.is.null,hotel_id.eq.${hotel.id}`)
    .order("created_at");
  if (rates.error) throw new Error("Failed to load hotel rates.");
  hotel.rates = (rates.data ?? []) as unknown as HotelDetail["rates"];
  hotel.gallery = [...(hotel.gallery ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  hotel.rooms = [...(hotel.rooms ?? [])]
    .map((room) => ({
      ...room,
      gallery: [...(room.gallery ?? [])].sort(
        (a, b) => a.display_order - b.display_order,
      ),
    }))
    .sort((a, b) => a.display_order - b.display_order);
  return hotel;
}
