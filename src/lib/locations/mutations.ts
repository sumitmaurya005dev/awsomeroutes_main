"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { locationSchema, type LocationFormValues } from "./validations";
import { hasPermission } from "@/lib/auth";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { resolveSelectedImage } from "@/lib/media/selection";

async function validateDestinationAndAsset(values: LocationFormValues) {
  const supabase = await createClient();
  const { data: destination } = await supabase.from("destinations").select("id").eq("id", values.destination_id).eq("status", "active").maybeSingle();
  if (!destination) return { supabase, error: "Selected active destination does not exist." };
  try {
    return { supabase, image: await resolveSelectedImage(values.image_asset_id, values.image_url) };
  } catch (error) {
    return { supabase, error: error instanceof Error ? error.message : "Selected image is invalid." };
  }
}

export async function createLocation(values: LocationFormValues) {
  if (!(await hasPermission("locations.create"))) return { success: false as const, error: "You do not have permission to create locations." };
  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields." };
  const valid = await validateDestinationAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("locations").insert({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, address: parsed.data.address || null, image_url: valid.image!.imageUrl, image_asset_id: valid.image!.imageAssetId, parent_location_id: null }).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A location with this slug already exists in this destination." : "Location could not be created." };
  return { success: true as const, data };
}

export async function updateLocation(id: string, values: LocationFormValues) {
  if (!(await hasPermission("locations.update"))) return { success: false as const, error: "You do not have permission to update locations." };
  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields." };
  const valid = await validateDestinationAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("locations").update({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, address: parsed.data.address || null, image_url: valid.image!.imageUrl, image_asset_id: valid.image!.imageAssetId, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A location with this slug already exists in this destination." : "Location could not be updated." };
  return { success: true as const, data };
}

export async function deleteLocation(id: string) {
  if (!(await hasPermission("locations.delete"))) {
    return { success: false as const, error: "You do not have permission to delete locations." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: "Invalid location identifier." };
  }

  const supabase = await createClient();
  const { count, error: dependencyError } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("parent_location_id", parsedId.data);

  if (dependencyError) {
    return { success: false as const, error: "Could not verify whether this location is safe to delete." };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false as const,
      error: `This location cannot be deleted because ${count} child ${count === 1 ? "location is" : "locations are"} linked to it. Reassign or delete the linked ${count === 1 ? "location" : "locations"} first, or mark this location inactive.`,
    };
  }

  const { data: deleted, error } = await supabase
    .from("locations")
    .delete()
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error) {
    return { success: false as const, error: getDeleteDependencyMessage(error, "Failed to delete location.") };
  }

  if (!deleted) {
    return {
      success: false as const,
      error:
        "The location was not deleted. It may already be removed, or the database delete policy did not allow this operation. Refresh the page and verify locations.delete permission for your role.",
    };
  }

  revalidatePath("/home/locations");
  return { success: true as const };
}
