import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import type {
  ItineraryDetail,
  ItineraryPermissions,
  ItineraryReferences,
  ItineraryRevision,
  ItineraryRow,
} from "@/types/custom-itinerary";

export const itineraryPermissions = cache(
  async (): Promise<ItineraryPermissions> => {
    const keys = await getUserPermissions();
    const can = (action: string) =>
      keys.some((x) => x === `custom_itineraries.${action}`);
    return {
      view: can("view"),
      create: can("create"),
      update: can("update"),
      delete: can("delete"),
      pricing: can("manage_pricing"),
      finalize: can("finalize"),
      export: can("export"),
    };
  },
);
export async function requireItineraryAccess(
  action: keyof ItineraryPermissions = "view",
) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword)
    throw new Error(
      "Sign in with an active account and change any temporary password first.",
    );
  const permissions = await itineraryPermissions();
  if (!permissions.view || !permissions[action])
    throw new Error(
      "Your role does not have permission for this itinerary action.",
    );
  return { user, permissions };
}
// New migration-specific boundary until generated Supabase types are refreshed.
// Never import this server-only client into browser components.
function database(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}
export async function itineraryDatabase(
  action: keyof ItineraryPermissions = "view",
) {
  await requireItineraryAccess(action);
  return database();
}
export async function getCustomItineraries(
  page = 1,
  search = "",
  status = "all",
) {
  const db = await itineraryDatabase();
  const limit = 25;
  page = Math.max(1, Math.floor(page) || 1);
  let query = db
    .from("custom_itineraries")
    .select(
      "id,quote_number,title,customer_name,customer_phone,travel_date,status,version,current_revision,created_at,updated_at,adults,children,infants",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (
    ["draft", "quoted", "sent", "accepted", "rejected", "expired"].includes(
      status,
    )
  )
    query = query.eq("status", status);
  if (search.trim())
    query = query.textSearch("search_document", search.trim().slice(0, 150), {
      type: "websearch",
      config: "simple",
    });
  const { data, error, count } = await query;
  if (error)
    throw new Error(
      "Could not load custom itineraries. Apply the custom-itinerary migration first.",
    );
  return {
    data: (data ?? []) as ItineraryRow[],
    count: count ?? 0,
    page,
    limit,
  };
}
export async function getCustomItinerary(
  id: string,
): Promise<ItineraryDetail | null> {
  const db = await itineraryDatabase();
  const { data, error } = await db
    .from("custom_itineraries")
    .select(
      "*,days:custom_itinerary_days(*,stays:custom_itinerary_stays(*),activities:custom_itinerary_activities(*,charges:custom_itinerary_activity_charges(charge_id))),transport:custom_itinerary_transport(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load the custom itinerary.");
  if (!data) return null;
  const raw = data as Omit<ItineraryDetail, "days"> & {
    days: Array<
      Omit<ItineraryDetail["days"][number], "activities"> & {
        activities: Array<
          ItineraryDetail["days"][number]["activities"][number] & {
            charges: { charge_id: string }[];
          }
        >;
      }
    >;
  };
  return {
    ...raw,
    travel_date: raw.travel_date ?? "",
    valid_until: raw.valid_until ?? "",
    total_override_paise: raw.total_override_paise ?? null,
    total_override_reason: raw.total_override_reason ?? "",
    days: [...raw.days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => ({
        ...d,
        activities: d.activities.map((a) => ({
          ...a,
          optional_charge_ids: (a.charges ?? []).map((c) => c.charge_id),
        })),
      })),
    transport: [...raw.transport].sort((a, b) => a.start_day - b.start_day),
  };
}
export async function getItineraryRevisions(
  id: string,
): Promise<ItineraryRevision[]> {
  const db = await itineraryDatabase();
  const { data, error } = await db
    .from("custom_itinerary_revisions")
    .select("id,itinerary_id,revision,document,calculation,created_at")
    .eq("itinerary_id", id)
    .order("revision", { ascending: false });
  if (error) throw new Error("Could not load quotation revisions.");
  return (data ?? []) as ItineraryRevision[];
}
export async function getItineraryReferences(): Promise<ItineraryReferences> {
  const db = await itineraryDatabase();
  // Paginate instead of silently hitting PostgREST's default 1,000-row limit.
  async function all(
    table: string,
    select: string,
    status: string[] = ["active"],
  ): Promise<unknown[]> {
    const records: unknown[] = [];
    const size = 500;
    for (let offset = 0; offset < 20000; offset += size) {
      const query = db
        .from(table)
        .select(select)
        .order("id")
        .range(offset, offset + size - 1);
      const { data, error } = await (status.length
        ? query.in("status", status)
        : query);
      if (error)
        throw new Error(`Could not load ${table} for itinerary selection.`);
      records.push(...(data ?? []));
      if ((data?.length ?? 0) < size) return records;
    }
    throw new Error(
      `Too many ${table} records for this editor. Narrow the catalog before continuing.`,
    );
  }
  const [
    destinations,
    locations,
    categories,
    hotels,
    rates,
    offerings,
    vehicleCategories,
    models,
    vendors,
    vehicleRates,
    rooms,
    fleet,
    drivers,
  ] = await Promise.all([
    all("destinations", "id,name,region:regions(name,country:countries(name))"),
    all("locations", "id,name,destination:destinations(id,name)"),
    all("hotel_categories", "id,name,slug"),
    all(
      "hotels",
      "id,name,location_id,status,rooms:hotel_rooms(id,name,category_id,status)",
    ),
    all("hotel_rate_cards", "*,category:hotel_categories(id,name,slug)"),
    all(
      "activity_offerings",
      "*,activity:activities(id,name,status),location:locations(id,name,destination:destinations(id,name)),variants:activity_variants(*),participant_prices:activity_participant_prices(*),charges:activity_charges(*)",
    ),
    all(
      "vehicle_categories",
      "id,name,slug,default_seating_capacity,default_comfort_capacity,default_luggage_capacity,status",
    ),
    all(
      "vehicle_models",
      "id,name,slug,category_id,seating_capacity,comfort_capacity,luggage_capacity,status",
    ),
    all("transport_vendors", "id,name,base_location_id"),
    all("vehicle_rate_cards", "*"),
    all("hotel_rooms", "*"),
    all(
      "fleet_vehicles",
      "id,model_id,vendor_id,registration_number,seating_capacity,comfort_capacity,luggage_capacity,status",
    ),
    all("drivers", "id,vendor_id,first_name,last_name,status,licence_expiry"),
  ]);
  return {
    destinations,
    locations,
    hotel_categories: categories,
    hotels,
    hotel_rates: rates,
    // Keep active offerings whose parent activity is still draft in the
    // reference payload so the editor can explain why the search result is
    // unavailable. Pricing/save logic still accepts active parent activities only.
    activity_offerings: offerings,
    vehicle_categories: vehicleCategories,
    vehicle_models: models,
    vehicle_vendors: vendors,
    vehicle_rates: vehicleRates,
    rooms,
    fleet,
    drivers,
    full_vehicle_categories: vehicleCategories,
    full_vehicle_models: models,
  } as ItineraryReferences;
}
export async function getClonePackages() {
  const db = await itineraryDatabase("create");
  const { data, error } = await db
    .from("packages")
    .select("id,name,duration_days")
    .in("status", ["draft", "published"])
    .order("name")
    .limit(500);
  if (error) throw new Error("Could not load package templates.");
  return (data ?? []) as { id: string; name: string; duration_days: number }[];
}
