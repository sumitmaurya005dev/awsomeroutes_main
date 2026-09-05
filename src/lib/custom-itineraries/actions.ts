"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  itineraryDatabase,
  requireItineraryAccess,
  getCustomItinerary,
  getItineraryReferences,
} from "./queries";
import { parseItinerary, pricingSignature } from "./validation";
import { calculateItinerary } from "./pricing";
import { makeQuoteDocument } from "./document";
import type {
  ItineraryInput,
  ItineraryDetail,
  ItineraryCalculation,
} from "@/types/custom-itinerary";
type Result<T> = { success: true; data: T } | { success: false; error: string };
function problem(e: unknown) {
  if (e instanceof z.ZodError)
    return e.issues
      .map((x) => x.message)
      .slice(0, 4)
      .join(" ");
  if (e instanceof Error) return e.message;
  const db = e as { code?: string; message?: string };
  if (db?.code === "23503")
    return "A selected catalog item was removed or is still linked. Reload the itinerary.";
  if (db?.code === "40001" || db?.code === "42501")
    return db.message ?? "This operation is not allowed.";
  return "The itinerary could not be saved. Check your connection and try again.";
}
function refresh(id: string) {
  revalidatePath("/home/custom-itineraries");
  revalidatePath(`/home/custom-itineraries/${id}`);
}
export async function previewCustomItinerary(
  input: unknown,
): Promise<Result<ItineraryCalculation>> {
  try {
    await requireItineraryAccess();
    const value = parseItinerary(input);
    return {
      success: true,
      data: calculateItinerary(value, await getItineraryReferences()),
    };
  } catch (e) {
    return { success: false, error: problem(e) };
  }
}
export async function saveCustomItinerary(
  input: unknown,
): Promise<Result<{ id: string; version: number }>> {
  try {
    const value = parseItinerary(input);
    const { user, permissions } = await requireItineraryAccess(
      value.version ? "update" : "create",
    );
    const previous = value.version ? await getCustomItinerary(value.id) : null;
    if (value.version && !previous) throw new Error("Itinerary not found.");
    if (previous && previous.status !== "draft")
      throw new Error("This quotation is locked. Start a new revision.");
    const blank = {
      ...value,
      markup_bps: 0,
      discount_paise: 0,
      total_override_paise: null,
      total_override_reason: "",
      days: [],
      transport: [],
    } as ItineraryInput;
    if (
      !permissions.pricing &&
      pricingSignature(value) !== pricingSignature(previous ?? blank)
    )
      throw new Error(
        "Pricing permission is required to change markup, discounts or overrides.",
      );
    // Pricing validation is server-side. Missing prices may remain as warnings in a draft, but block finalization.
    calculateItinerary(value, await getItineraryReferences());
    const db = await itineraryDatabase(value.version ? "update" : "create");
    const { data, error } = await db.rpc("save_custom_itinerary", {
      p_actor: user.id,
      p_input: value,
    });
    if (error) throw error;
    if (!data) throw new Error("Save did not return an itinerary.");
    refresh(value.id);
    return {
      success: true,
      data: { id: value.id, version: value.version + 1 },
    };
  } catch (e) {
    console.error(
      "Custom itinerary save failed",
      e instanceof Error ? e.message : (e as { code?: string })?.code,
    );
    return { success: false, error: problem(e) };
  }
}
export async function finalizeCustomItinerary(
  id: string,
  version: number,
): Promise<Result<number>> {
  try {
    z.uuid().parse(id);
    z.number().int().positive().parse(version);
    const { user } = await requireItineraryAccess("finalize");
    const value = await getCustomItinerary(id);
    if (!value || value.version !== version)
      throw new Error("Itinerary changed. Reload before finalizing.");
    if (value.status !== "draft")
      throw new Error("This quotation is already finalized.");
    parseItinerary(value);
    if (!value.travel_date || !value.valid_until || !value.days.length)
      throw new Error("Set travel date, quote validity and at least one day.");
    if (value.valid_until < new Date().toISOString().slice(0, 10))
      throw new Error("Quotation validity cannot be in the past.");
    const refs = await getItineraryReferences(),
      calculation = calculateItinerary(value, refs);
    if (calculation.warnings.length)
      throw new Error(calculation.warnings.slice(0, 5).join(" "));
    const db = await itineraryDatabase("finalize");
    const { data, error } = await db.rpc("finalize_custom_itinerary", {
      p_actor: user.id,
      p_id: id,
      p_version: version,
      p_document: makeQuoteDocument(
        value,
        calculation,
        refs,
        new Date().toISOString(),
      ),
      p_calculation: calculation,
      p_source: value,
    });
    if (error) throw error;
    refresh(id);
    return { success: true, data: Number(data) };
  } catch (e) {
    return { success: false, error: problem(e) };
  }
}
export async function changeCustomItineraryStatus(
  id: string,
  version: number,
  status: string,
): Promise<Result<null>> {
  try {
    z.uuid().parse(id);
    z.number().int().positive().parse(version);
    z.enum(["draft", "sent", "accepted", "rejected", "expired"]).parse(status);
    const { user } = await requireItineraryAccess(
      status === "draft" ? "update" : "finalize",
    );
    const db = await itineraryDatabase(
      status === "draft" ? "update" : "finalize",
    );
    const { error } = await db.rpc("transition_custom_itinerary", {
      p_actor: user.id,
      p_id: id,
      p_version: version,
      p_status: status,
    });
    if (error) throw error;
    refresh(id);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: problem(e) };
  }
}
export async function deleteCustomItinerary(
  id: string,
  version: number,
): Promise<Result<null>> {
  try {
    z.uuid().parse(id);
    z.number().int().positive().parse(version);
    const { user } = await requireItineraryAccess("delete");
    const db = await itineraryDatabase("delete");
    const { error } = await db.rpc("delete_custom_itinerary", {
      p_actor: user.id,
      p_id: id,
      p_version: version,
    });
    if (error) throw error;
    refresh(id);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: problem(e) };
  }
}
export async function clonePackageIntoItinerary(
  packageId: string,
  categoryId: string,
  group: { adults: number; children: number; infants: number },
): Promise<
  Result<
    Pick<
      ItineraryInput,
      "title" | "days" | "transport" | "terms" | "source_package_id"
    >
  >
> {
  try {
    z.uuid().parse(packageId);
    z.uuid().parse(categoryId);
    const guests = z
      .object({
        adults: z.number().int().min(1).max(100),
        children: z.number().int().min(0).max(100),
        infants: z.number().int().min(0).max(100),
      })
      .parse(group);
    await requireItineraryAccess("create");
    const db = await itineraryDatabase("create");
    const { data: p, error } = await db
      .from("packages")
      .select(
        "id,name,status,itinerary:package_itinerary_days(*,hotels:package_day_hotels(*),activities:package_day_activities(*)),vehicles:package_vehicle_options(*),content:package_content_items(*)",
      )
      .eq("id", packageId)
      .in("status", ["draft", "published"])
      .single();
    if (error || !p) throw new Error("Package is unavailable for cloning.");
    const refs = await getItineraryReferences();
    if (!refs.hotel_categories.some((x) => x.id === categoryId))
      throw new Error("Select an active hotel category.");
    // Source data is used only as a template. New UUIDs and independent rows never modify the website package.
    const source = p as unknown as {
      id: string;
      name: string;
      itinerary: import("@/types/package").PackageItineraryDay[];
      vehicles: import("@/types/package").PackageVehicleOption[];
      content: import("@/types/package").PackageContentItem[];
    };
    const days: ItineraryDetail["days"] = source.itinerary
      .sort((a, b) => a.day_number - b.day_number)
      .map((d, index) => {
        const chosen = d.hotels.find(
          (h) => h.hotel_category_id === categoryId && h.is_primary,
        );
        const hotel = chosen
          ? refs.hotels.find((h) => h.id === chosen.hotel_id)
          : refs.hotels.find(
              (h) =>
                h.location_id === d.overnight_location_id &&
                h.rooms.some(
                  (r) => r.category_id === categoryId && r.status === "active",
                ),
            );
        const room =
          chosen?.hotel_room_id ??
          hotel?.rooms.find(
            (r) => r.category_id === categoryId && r.status === "active",
          )?.id ??
          null;
        return {
          id: crypto.randomUUID(),
          day_number: index + 1,
          title: d.title,
          description: [d.summary, d.description].filter(Boolean).join("\n\n"),
          start_location_id: d.start_location_id,
          end_location_id: d.end_location_id,
          overnight_location_id: d.overnight_location_id,
          distance_km: d.distance_km,
          travel_minutes: d.travel_minutes,
          breakfast: d.breakfast_included,
          lunch: d.lunch_included,
          dinner: d.dinner_included,
          stays:
            hotel && d.overnight_location_id
              ? [
                  {
                    id: crypto.randomUUID(),
                    hotel_id: hotel.id,
                    room_id: room,
                    category_id: categoryId,
                    meal_plan: chosen?.meal_plan ?? "CP",
                    adults: guests.adults,
                    children_with_bed: guests.children,
                    children_without_bed: 0,
                    infants: guests.infants,
                    rooms: Math.max(1, Math.floor(guests.adults / 2)),
                    extra_adult_beds: guests.adults > 1 ? guests.adults % 2 : 0,
                    override_total_paise: null,
                    override_reason: "",
                  },
                ]
              : [],
          activities: d.activities.map((a) => ({
            id: crypto.randomUUID(),
            offering_id: a.activity_offering_id,
            variant_id: a.activity_variant_id,
            adults: guests.adults,
            children: guests.children,
            infants: guests.infants,
            quantity: a.quantity,
            units: null,
            optional: a.is_optional,
            optional_charge_ids: [],
            override_total_paise: null,
            override_reason: "",
          })),
        };
      });
    const pax = guests.adults + guests.children,
      vehicles = source.vehicles.filter(
        (v) => pax >= v.minimum_pax && pax <= v.maximum_pax,
      );
    return {
      success: true,
      data: {
        title: source.name,
        source_package_id: source.id,
        days,
        transport: vehicles.map((t) => ({
          id: crypto.randomUUID(),
          start_day: 1,
          end_day: days.length,
          base_location_id: t.base_location_id,
          category_id: t.vehicle_category_id,
          model_id: t.vehicle_model_id,
          vendor_id: t.vendor_id,
          fleet_id: null,
          driver_id: null,
          quantity: t.quantity,
          luggage_only: false,
          override_total_paise: null,
          override_reason: "",
        })),
        terms: source.content
          .sort((a, b) => a.display_order - b.display_order)
          .map((x) => `${x.section_title}\n${x.content}`)
          .join("\n\n")
          .slice(0, 12000),
      },
    };
  } catch (e) {
    return { success: false, error: problem(e) };
  }
}
