
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  regionSchema,
  type RegionFormValues,
} from "./validations";
import { hasPermission } from "@/lib/auth";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { resolveSelectedImage } from "@/lib/media/selection";

/**
 * Create Region
 */
export async function createRegion(
  values: RegionFormValues
) {
  if (!(await hasPermission("regions.create"))) {
    return { success: false, error: "You do not have permission to create regions." };
  }
  const supabase = await createClient();

  // ----------------------------------
  // Validate input
  // ----------------------------------

  const parsed = regionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please check the form fields.",
      fieldErrors:
        parsed.error.flatten().fieldErrors,
    };
  }

  const {
    country_id,
    name,
    slug,
    description,
    image_url,
    image_asset_id,
    status,
  } = parsed.data;
  let selectedImage;
  try {
    selectedImage = await resolveSelectedImage(image_asset_id, image_url);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Selected image is invalid." };
  }

  // ----------------------------------
  // Current user
  // ----------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  // ----------------------------------
  // Check country
  // ----------------------------------

  const { data: country, error: countryError } =
    await supabase
      .from("countries")
      .select("id")
      .eq("id", country_id)
      .maybeSingle();

  if (countryError) {

    return {
      success: false,
      error: "Failed to validate selected country.",
    };
  }

  if (!country) {
    return {
      success: false,
      error: "Selected country does not exist.",
      fieldErrors: {
        country_id: [
          "Please select a valid country.",
        ],
      },
    };
  }

  // ----------------------------------
  // Check duplicate slug
  // ----------------------------------

  const {
    data: existingRegion,
    error: duplicateError,
  } = await supabase
    .from("regions")
    .select("id")
    .eq("country_id", country_id)
    .eq("slug", slug)
    .maybeSingle();

  if (duplicateError) {

    return {
      success: false,
      error: "Failed to validate region.",
    };
  }

  if (existingRegion) {
    return {
      success: false,
      error:
        "A region with this slug already exists in this country.",
      fieldErrors: {
        slug: [
          "This slug already exists in this country.",
        ],
      },
    };
  }

  // ----------------------------------
  // Insert
  // ----------------------------------

  const { data, error } = await supabase
    .from("regions")
    .insert({
      country_id,
      name,
      slug,
      description: description || null,
      image_url: selectedImage.imageUrl,
      image_asset_id: selectedImage.imageAssetId,
      status,
    })
    .select(
      `
        *,
        country:countries (
          id,
          name,
          slug
        )
      `
    )
    .single();

  if (error) {

    // Database unique constraint
    if (error.code === "23505") {
      return {
        success: false,
        error:
          "A region with this slug already exists in this country.",
        fieldErrors: {
          slug: [
            "This slug already exists in this country.",
          ],
        },
      };
    }

    return {
      success: false,
      error: "Failed to create region.",
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * Update Region
 */
export async function updateRegion(
  id: string,
  values: RegionFormValues
) {
  if (!(await hasPermission("regions.update"))) {
    return { success: false, error: "You do not have permission to update regions." };
  }

  const supabase = await createClient();

  // ----------------------------------
  // Validate input
  // ----------------------------------

  const parsed = regionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please check the form fields.",
      fieldErrors:
        parsed.error.flatten().fieldErrors,
    };
  }

  const {
    country_id,
    name,
    slug,
    description,
    image_url,
    image_asset_id,
    status,
  } = parsed.data;
  let selectedImage;
  try {
    selectedImage = await resolveSelectedImage(image_asset_id, image_url);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Selected image is invalid." };
  }

  // ----------------------------------
  // Current user
  // ----------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  // ----------------------------------
  // Check region exists
  // ----------------------------------

  const {
    data: existingRegion,
    error: regionError,
  } = await supabase
    .from("regions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (regionError) {

    return {
      success: false,
      error: "Failed to validate region.",
    };
  }

  if (!existingRegion) {
    return {
      success: false,
      error: "Region not found.",
    };
  }

  // ----------------------------------
  // Check country
  // ----------------------------------

  const { data: country, error: countryError } =
    await supabase
      .from("countries")
      .select("id")
      .eq("id", country_id)
      .maybeSingle();

  if (countryError) {

    return {
      success: false,
      error: "Failed to validate selected country.",
    };
  }

  if (!country) {
    return {
      success: false,
      error: "Selected country does not exist.",
      fieldErrors: {
        country_id: [
          "Please select a valid country.",
        ],
      },
    };
  }

  // ----------------------------------
  // Check duplicate slug
  // ----------------------------------

  const {
    data: duplicateRegion,
    error: duplicateError,
  } = await supabase
    .from("regions")
    .select("id")
    .eq("country_id", country_id)
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (duplicateError) {

    return {
      success: false,
      error: "Failed to validate region.",
    };
  }

  if (duplicateRegion) {
    return {
      success: false,
      error:
        "A region with this slug already exists in this country.",
      fieldErrors: {
        slug: [
          "This slug already exists in this country.",
        ],
      },
    };
  }

  // ----------------------------------
  // Update
  // ----------------------------------

  const { data, error } = await supabase
    .from("regions")
    .update({
      country_id,
      name,
      slug,
      description: description || null,
      image_url: selectedImage.imageUrl,
      image_asset_id: selectedImage.imageAssetId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
        *,
        country:countries (
          id,
          name,
          slug
        )
      `
    )
    .single();

  if (error) {

    // Database unique constraint
    if (error.code === "23505") {
      return {
        success: false,
        error:
          "A region with this slug already exists in this country.",
        fieldErrors: {
          slug: [
            "This slug already exists in this country.",
          ],
        },
      };
    }

    return {
      success: false,
      error: "Failed to update region.",
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * Delete Region
 */
export async function deleteRegion(
  id: string
) {
  if (!(await hasPermission("regions.delete"))) {
    return { success: false, error: "You do not have permission to delete regions." };
  }
  const supabase = await createClient();

  // ----------------------------------
  // Current user
  // ----------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  const { count, error: dependencyError } = await supabase
    .from("destinations")
    .select("id", { count: "exact", head: true })
    .eq("region_id", id);

  if (dependencyError) {
    return {
      success: false,
      error: "Could not verify whether this region is safe to delete.",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `This region cannot be deleted because ${count} ${count === 1 ? "destination is" : "destinations are"} linked to it. Reassign or delete the linked ${count === 1 ? "destination" : "destinations"} first, or mark the region inactive.`,
    };
  }

  // ----------------------------------
  // Delete
  // ----------------------------------

  const { error } = await supabase
    .from("regions")
    .delete()
    .eq("id", id);

  if (error) {

    return {
      success: false,
      error: getDeleteDependencyMessage(error, "Failed to delete region."),
    };
  }

  return {
    success: true,
  };
}
