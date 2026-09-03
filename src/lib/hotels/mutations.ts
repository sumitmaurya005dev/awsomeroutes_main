"use server";
import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
  getUserPermissions,
  requirePermission,
} from "@/lib/auth";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { createHotelDatabaseClient } from "./database";
import {
  hotelRateSchema,
  hotelRoomSchema,
  hotelSchema,
  type HotelRateValues,
  type HotelRoomValues,
  type HotelValues,
} from "./validations";
import {
  canCreateRoomForHotel,
  isHotelRateOverride,
  requiresHotelRateOverridePermission,
} from "./authorization";

type Result<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };
function message(e: unknown, fallback: string) {
  if (typeof e === "object" && e) {
    const databaseError = e as {
      code?: string;
      message?: string;
      details?: string;
    };

    if (databaseError.code === "23503")
      return getDeleteDependencyMessage(databaseError, fallback);

    if (databaseError.message?.trim()) return databaseError.message;
  }
  return e instanceof Error ? e.message : fallback;
}
function hotelPayload(v: HotelValues) {
  const { gallery_asset_ids, amenity_ids, ...payload } = v;
  void gallery_asset_ids;
  void amenity_ids;
  return payload;
}
function roomPayload(v: HotelRoomValues) {
  const { gallery_asset_ids, ...payload } = v;
  void gallery_asset_ids;
  return payload;
}

async function saveHotel(id: string | null, values: HotelValues) {
  const parsed = hotelSchema.parse(values),
    db = await createHotelDatabaseClient();
  const { data, error } = await db.rpc("save_hotel_with_gallery", {
    // Supabase's generated RPC type does not model nullable function inputs.
    p_hotel_id: id as string,
    p_hotel: hotelPayload(parsed),
    p_gallery_asset_ids: [...new Set(parsed.gallery_asset_ids)],
    p_amenity_ids: [...new Set(parsed.amenity_ids)],
  });
  if (error) {
    if (error.code === "23505")
      throw new Error(
        "A hotel with this slug already exists at the selected location.",
      );
    throw error;
  }
  if (!data) throw new Error("Hotel could not be saved.");
  return String(data);
}
export async function createHotel(
  values: HotelValues,
): Promise<Result<{ id: string }>> {
  try {
    await requirePermission("hotels.create");
    const id = await saveHotel(null, values);
    revalidatePath("/home/hotels");
    return { success: true, data: { id } };
  } catch (e) {
    console.error(e);
    return { success: false, error: message(e, "Failed to create hotel.") };
  }
}
export async function updateHotel(
  id: string,
  values: HotelValues,
): Promise<Result<{ id: string }>> {
  try {
    await requirePermission("hotels.update");
    const parsed = hotelSchema.parse(values);
    const db = await createHotelDatabaseClient();
    const { data: current, error: currentError } = await db
      .from("hotels")
      .select("location_id")
      .eq("id", id)
      .maybeSingle();
    if (currentError || !current)
      throw currentError ?? new Error("Hotel was not found.");
    if (current.location_id !== parsed.location_id) {
      const [rooms, rates] = await Promise.all([
        db
          .from("hotel_rooms")
          .select("id", { count: "exact", head: true })
          .eq("hotel_id", id),
        db
          .from("hotel_rate_cards")
          .select("id", { count: "exact", head: true })
          .eq("hotel_id", id),
      ]);
      if (rooms.error || rates.error) throw rooms.error ?? rates.error;
      if ((rooms.count ?? 0) > 0 || (rates.count ?? 0) > 0) {
        throw new Error(
          "Remove this hotel's rooms and price overrides before changing its location.",
        );
      }
    }
    await saveHotel(id, values);
    revalidatePath("/home/hotels");
    revalidatePath(`/home/hotels/${id}/edit`);
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: message(e, "Failed to update hotel.") };
  }
}
export async function deleteHotel(id: string): Promise<Result> {
  try {
    await requirePermission("hotels.delete");
    const db = await createHotelDatabaseClient();
    const { error } = await db.from("hotels").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/home/hotels");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: message(
        e,
        "This hotel cannot be deleted because it is already in use. Set it inactive instead.",
      ),
    };
  }
}

export async function saveHotelRoom(
  id: string | null,
  values: HotelRoomValues,
): Promise<Result<{ id: string }>> {
  try {
    const parsed = hotelRoomSchema.parse(values);
    const db = await createHotelDatabaseClient();

    if (id) {
      await requirePermission("hotels.update");
    } else {
      const [permissions, currentUser, hotelResult] = await Promise.all([
        getUserPermissions(),
        getCurrentUser(),
        db
          .from("hotels")
          .select("created_by")
          .eq("id", parsed.hotel_id)
          .maybeSingle(),
      ]);
      if (hotelResult.error || !hotelResult.data)
        throw hotelResult.error ?? new Error("Hotel was not found.");
      if (
        !canCreateRoomForHotel({
          permissions,
          currentUserId: currentUser?.id,
          hotelCreatedBy: hotelResult.data.created_by,
        })
      )
        throw new Error(
          "You can add rooms only to hotels you created, unless you have hotels.update permission.",
        );
    }

    if (id) {
      const { data: current, error: currentError } = await db
        .from("hotel_rooms")
        .select("category_id")
        .eq("id", id)
        .eq("hotel_id", parsed.hotel_id)
        .maybeSingle();
      if (currentError || !current)
        throw currentError ?? new Error("Room was not found.");
      if (current.category_id !== parsed.category_id) {
        const { count, error: rateError } = await db
          .from("hotel_rate_cards")
          .select("id", { count: "exact", head: true })
          .eq("room_id", id);
        if (rateError) throw rateError;
        if ((count ?? 0) > 0)
          throw new Error(
            "Delete this room's price overrides before changing its category.",
          );
      }
    }
    const { data, error } = await db.rpc("save_hotel_room_with_gallery", {
      // Supabase's generated RPC type does not model nullable function inputs.
      p_room_id: id as string,
      p_room: roomPayload(parsed),
      p_gallery_asset_ids: [...new Set(parsed.gallery_asset_ids)],
    });
    if (error) {
      if (error.code === "23505")
        throw new Error("This hotel already has a room with that slug.");
      throw error;
    }
    if (!data) throw new Error("Room could not be saved.");
    revalidatePath(`/home/hotels/${parsed.hotel_id}/edit`);
    return { success: true, data: { id: String(data) } };
  } catch (e) {
    console.error("Save hotel room failed:", e);
    return { success: false, error: message(e, "Failed to save room.") };
  }
}
export async function deleteHotelRoom(
  id: string,
  hotelId: string,
): Promise<Result> {
  try {
    await requirePermission("hotels.delete");
    const db = await createHotelDatabaseClient();
    const { error } = await db
      .from("hotel_rooms")
      .delete()
      .eq("id", id)
      .eq("hotel_id", hotelId);
    if (error) throw error;
    revalidatePath(`/home/hotels/${hotelId}/edit`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: message(
        e,
        "This room cannot be deleted because it is already used by pricing or a package.",
      ),
    };
  }
}

export async function saveHotelRate(
  id: string | null,
  hotelContextId: string,
  values: HotelRateValues,
): Promise<Result<{ id: string }>> {
  try {
    await requirePermission("hotels.manage_pricing");
    const parsed = hotelRateSchema.parse(values);
    const db = await createHotelDatabaseClient();
    const { data: contextHotel, error: contextError } = await db
      .from("hotels")
      .select("location_id")
      .eq("id", hotelContextId)
      .maybeSingle();
    if (contextError || !contextHotel)
      throw contextError ?? new Error("Hotel was not found.");
    if (contextHotel.location_id !== parsed.location_id)
      throw new Error("The rate location does not match this hotel.");
    if (parsed.hotel_id !== hotelContextId)
      throw new Error(
        "Location defaults must be managed from Location Pricing. This form only saves hotel or room overrides.",
      );

    let currentScope: { hotel_id: string | null; room_id: string | null } | null =
      null;
    if (id) {
      const { data: current, error: currentError } = await db
        .from("hotel_rate_cards")
        .select("hotel_id,room_id")
        .eq("id", id)
        .maybeSingle();
      if (currentError || !current)
        throw currentError ?? new Error("Rate card was not found.");
      if (current.hotel_id !== hotelContextId)
        throw new Error("This override does not belong to the selected hotel.");
      currentScope = current;
    }
    if (requiresHotelRateOverridePermission(currentScope, parsed))
      await requirePermission("hotels.override_price");

    const userId = (await db.auth.getUser()).data.user?.id ?? null;
    const query = id
      ? db
          .from("hotel_rate_cards")
          .update({ ...parsed, updated_by: userId })
          .eq("id", id)
          .select("id")
          .single()
      : db
          .from("hotel_rate_cards")
          .insert({ ...parsed, created_by: userId, updated_by: userId })
          .select("id")
          .single();
    const { data, error } = await query;
    if (error) {
      if (error.code === "23505")
        throw new Error(
          "A rate already exists for this scope, category and meal plan.",
        );
      throw error;
    }
    if (!data?.id) throw new Error("Rate card could not be saved.");
    revalidatePath(`/home/hotels/${hotelContextId}/edit`);
    return { success: true, data: { id: String(data.id) } };
  } catch (e) {
    console.error("Save hotel rate failed:", e);
    return { success: false, error: message(e, "Failed to save rate.") };
  }
}
export async function deleteHotelRate(
  id: string,
  hotelId: string,
): Promise<Result> {
  try {
    await requirePermission("hotels.manage_pricing");
    const db = await createHotelDatabaseClient();
    const { data: rate, error: rateError } = await db
      .from("hotel_rate_cards")
      .select("hotel_id,room_id")
      .eq("id", id)
      .maybeSingle();
    if (rateError || !rate)
      throw rateError ?? new Error("Rate card was not found.");
    if (!isHotelRateOverride(rate))
      throw new Error("Location defaults must be deleted from Location Pricing.");
    if (rate.hotel_id !== hotelId)
      throw new Error("This override does not belong to the selected hotel.");
    await requirePermission("hotels.override_price");
    const { data: deleted, error } = await db
      .from("hotel_rate_cards")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!deleted)
      throw new Error(
        "The override was not deleted. Verify your hotel pricing permissions.",
      );
    revalidatePath(`/home/hotels/${hotelId}/edit`);
    return { success: true };
  } catch (e) {
    return { success: false, error: message(e, "Failed to delete rate.") };
  }
}

export async function saveHotelLocationRate(
  id: string | null,
  values: HotelRateValues,
): Promise<Result<{ id: string }>> {
  try {
    await requirePermission("hotels.manage_pricing");
    const parsed = hotelRateSchema.parse(values);
    if (parsed.hotel_id || parsed.room_id)
      throw new Error("Location pricing cannot contain a hotel or room override.");
    const db = await createHotelDatabaseClient();
    if (id) {
      const { data: existing, error: existingError } = await db
        .from("hotel_rate_cards")
        .select("hotel_id,room_id")
        .eq("id", id)
        .maybeSingle();
      if (existingError || !existing)
        throw existingError ?? new Error("Location rate was not found.");
      if (existing.hotel_id || existing.room_id)
        throw new Error("Only location defaults can be edited from this module.");
    }
    const userId = (await db.auth.getUser()).data.user?.id ?? null;
    const query = id
      ? db.from("hotel_rate_cards").update({ ...parsed, updated_by: userId }).eq("id", id)
      : db.from("hotel_rate_cards").insert({ ...parsed, created_by: userId, updated_by: userId });
    const { data, error } = await query.select("id").single();
    if (error) {
      if (error.code === "23505")
        throw new Error("This location, category and meal plan already has a default rate. Edit the existing rate instead.");
      throw error;
    }
    if (!data?.id) throw new Error("Location rate could not be saved.");
    revalidatePath("/home/hotels/pricing");
    revalidatePath("/home/hotels", "layout");
    return { success: true, data: { id: String(data.id) } };
  } catch (e) {
    console.error("Save hotel location rate failed:", e);
    return { success: false, error: message(e, "Failed to save location rate.") };
  }
}

export async function deleteHotelLocationRate(id: string): Promise<Result> {
  try {
    await requirePermission("hotels.manage_pricing");
    const db = await createHotelDatabaseClient();
    const { data: rate, error: rateError } = await db
      .from("hotel_rate_cards")
      .select("hotel_id,room_id")
      .eq("id", id)
      .maybeSingle();
    if (rateError || !rate)
      throw rateError ?? new Error("Location rate was not found.");
    if (rate.hotel_id || rate.room_id)
      throw new Error("Hotel and room overrides cannot be deleted from Location Pricing.");
    const { data: deleted, error } = await db
      .from("hotel_rate_cards")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!deleted) throw new Error("The location rate was not deleted. Verify your pricing permission.");
    revalidatePath("/home/hotels/pricing");
    revalidatePath("/home/hotels", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: message(e, "Failed to delete location rate.") };
  }
}
