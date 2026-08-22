"use server";

import { createClient } from "@/lib/supabase/server";
import { destinationSchema, type DestinationFormValues } from "./validations";

async function validateRegionAndAsset(values: DestinationFormValues) {
  const supabase = await createClient();
  const { data: region } = await supabase.from("regions").select("id").eq("id", values.region_id).eq("status", "active").maybeSingle();
  if (!region) return { supabase, error: "Selected active region does not exist." };
  if (values.image_asset_id) {
    const { data: asset } = await supabase.from("media_assets").select("id").eq("id", values.image_asset_id).eq("status", "active").maybeSingle();
    if (!asset) return { supabase, error: "Selected image does not exist or is archived." };
  }
  return { supabase };
}

export async function createDestination(values: DestinationFormValues) {
  const parsed = destinationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const valid = await validateRegionAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("destinations").insert({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, image_url: parsed.data.image_url || null, image_asset_id: parsed.data.image_asset_id || null }).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A destination with this slug already exists in this region." : error.message };
  return { success: true as const, data };
}

export async function updateDestination(id: string, values: DestinationFormValues) {
  const parsed = destinationSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: "Please check the form fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const valid = await validateRegionAndAsset(parsed.data);
  if (valid.error) return { success: false as const, error: valid.error };
  const { data, error } = await valid.supabase.from("destinations").update({ ...parsed.data, short_description: parsed.data.short_description || null, description: parsed.data.description || null, image_url: parsed.data.image_url || null, image_asset_id: parsed.data.image_asset_id || null, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return { success: false as const, error: error.code === "23505" ? "A destination with this slug already exists in this region." : error.message };
  return { success: true as const, data };
}
