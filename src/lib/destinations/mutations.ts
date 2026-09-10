"use server";

import { createClient } from "@/lib/supabase/server";
import { destinationSchema, type DestinationFormValues } from "./validations";
import { hasPermission } from "@/lib/auth";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { resolveSelectedImage } from "@/lib/media/selection";

async function validateRegionAndAsset(values: DestinationFormValues) {
  const supabase = await createClient();
  const { data: region } = await supabase.from("regions").select("id").eq("id", values.region_id).eq("status", "active").maybeSingle();
  if (!region) return { supabase, error: "Selected active region does not exist." };
  try {
    return { supabase, image: await resolveSelectedImage(values.image_asset_id, values.image_url) };
  } catch (error) {
    return { supabase, error: error instanceof Error ? error.message : "Selected image is invalid." };
  }
}

export async function createDestination(values: DestinationFormValues) {
  if (!(await hasPermission("destinations.create"))) return { success: false as const, error: "You do not have permission to create destinations." };
  const parsed = destinationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const valid = await validateRegionAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("destinations").insert({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, image_url: valid.image!.imageUrl, image_asset_id: valid.image!.imageAssetId }).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A destination with this slug already exists in this region." : "Destination could not be created." };
  return { success: true as const, data };
}

export async function updateDestination(id: string, values: DestinationFormValues) {
  if (!(await hasPermission("destinations.update"))) return { success: false as const, error: "You do not have permission to update destinations." };
  const parsed = destinationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const valid = await validateRegionAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("destinations").update({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, image_url: valid.image!.imageUrl, image_asset_id: valid.image!.imageAssetId, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A destination with this slug already exists in this region." : "Destination could not be updated." };
  return { success: true as const, data };
}

export async function deleteDestination(id: string) {
  if (!(await hasPermission("destinations.delete"))) {
    return { success: false as const, error: "You do not have permission to delete destinations." };
  }

  const supabase = await createClient();
  const { count, error: dependencyError } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("destination_id", id);

  if (dependencyError) {
    return { success: false as const, error: "Could not verify whether this destination is safe to delete." };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false as const,
      error: `This destination cannot be deleted because ${count} ${count === 1 ? "location is" : "locations are"} linked to it. Reassign or delete the linked ${count === 1 ? "location" : "locations"} first, or mark the destination inactive.`,
    };
  }

  const { error } = await supabase.from("destinations").delete().eq("id", id);
  if (error) {
    return { success: false as const, error: getDeleteDependencyMessage(error, "Failed to delete destination.") };
  }

  return { success: true as const };
}
