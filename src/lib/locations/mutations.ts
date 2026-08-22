"use server";

import { createClient } from "@/lib/supabase/server";
import { locationSchema, type LocationFormValues } from "./validations";

async function validateDestinationAndAsset(values: LocationFormValues) {
  const supabase = await createClient();
  const { data: destination } = await supabase.from("destinations").select("id").eq("id", values.destination_id).eq("status", "active").maybeSingle();
  if (!destination) return { supabase, error: "Selected active destination does not exist." };
  if (values.image_asset_id) {
    const { data: asset } = await supabase.from("media_assets").select("id").eq("id", values.image_asset_id).eq("status", "active").maybeSingle();
    if (!asset) return { supabase, error: "Selected image does not exist or is archived." };
  }
  return { supabase };
}

export async function createLocation(values: LocationFormValues) {
  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields." };
  const valid = await validateDestinationAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("locations").insert({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, address: parsed.data.address || null, image_url: parsed.data.image_url || null, image_asset_id: parsed.data.image_asset_id || null, parent_location_id: null }).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A location with this slug already exists in this destination." : error.message };
  return { success: true as const, data };
}

export async function updateLocation(id: string, values: LocationFormValues) {
  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields." };
  const valid = await validateDestinationAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("locations").update({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, address: parsed.data.address || null, image_url: parsed.data.image_url || null, image_asset_id: parsed.data.image_asset_id || null, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A location with this slug already exists in this destination." : error.message };
  return { success: true as const, data };
}
