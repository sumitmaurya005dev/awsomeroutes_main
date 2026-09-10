import { createClient } from "@/lib/supabase/server";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { resolveSelectedImage } from "@/lib/media/selection";
import type {
  Country,
  CountryInsert,
  CountryUpdate,
} from "@/types/country";

/**
 * Create a new country.
 */
export async function createCountry(
  payload: CountryInsert,
): Promise<Country> {
  const supabase = await createClient();
  const selectedImage = await resolveSelectedImage(
    payload.image_asset_id,
    payload.image_url,
  );

  const { data, error } = await supabase
    .from("countries")
    .insert({ ...payload, image_asset_id: selectedImage.imageAssetId, image_url: selectedImage.imageUrl })
    .select("*")
    .single();

  if (error) {

    // PostgreSQL unique constraint violation
    if (error.code === "23505") {
      throw new Error(
        "A country with the same name, slug, or ISO code already exists.",
      );
    }

    throw new Error("Failed to create country");
  }

  if (!data) {
    throw new Error("Country was not created.");
  }

  return data;
}

/**
 * Update an existing country.
 */
export async function updateCountry(
  id: string,
  payload: CountryUpdate,
): Promise<Country> {
  const supabase = await createClient();
  const selectedImage =
    "image_asset_id" in payload || "image_url" in payload
      ? await resolveSelectedImage(payload.image_asset_id, payload.image_url)
      : null;

  const { data, error } = await supabase
    .from("countries")
    .update(
      selectedImage
        ? { ...payload, image_asset_id: selectedImage.imageAssetId, image_url: selectedImage.imageUrl }
        : payload,
    )
    .eq("id", id)
    .select("*")
    .single();

  if (error) {

    // PostgreSQL unique constraint violation
    if (error.code === "23505") {
      throw new Error(
        "A country with the same name, slug, or ISO code already exists.",
      );
    }

    throw new Error("Failed to update country");
  }

  if (!data) {
    throw new Error("Country was not updated.");
  }

  return data;
}

/**
 * Delete a country.
 */
export async function deleteCountry(
  id: string,
): Promise<void> {
  const supabase = await createClient();

  const { count, error: dependencyError } = await supabase
    .from("regions")
    .select("id", { count: "exact", head: true })
    .eq("country_id", id);

  if (dependencyError) {
    throw new Error("Could not verify whether this country is safe to delete.");
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      `This country cannot be deleted because ${count} ${count === 1 ? "region is" : "regions are"} linked to it. Reassign or delete the linked ${count === 1 ? "region" : "regions"} first, or mark the country inactive.`,
    );
  }

  const { error } = await supabase
    .from("countries")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      getDeleteDependencyMessage(error, "Failed to delete country."),
    );
  }
}

/**
 * Update country active/inactive status.
 */
export async function updateCountryStatus(
  id: string,
  status: Country["status"],
): Promise<Country> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Failed to update country status");
  }

  if (!data) {
    throw new Error("Country status was not updated.");
  }

  return data;
}
