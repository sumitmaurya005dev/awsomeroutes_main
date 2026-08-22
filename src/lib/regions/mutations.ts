
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  regionSchema,
  type RegionFormValues,
} from "./validations";

/**
 * Create Region
 */
export async function createRegion(
  values: RegionFormValues
) {
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
    console.error(
      "Error checking country:",
      countryError
    );

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
    console.error(
      "Error checking duplicate region:",
      duplicateError
    );

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
      image_url: image_url || null,
      image_asset_id: image_asset_id || null,
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
    console.error(
      "Error creating region:",
      error
    );

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
    console.error(
      "Error checking region:",
      regionError
    );

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
    console.error(
      "Error checking country:",
      countryError
    );

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
    console.error(
      "Error checking duplicate region:",
      duplicateError
    );

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
      image_url: image_url || null,
      image_asset_id: image_asset_id || null,
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
    console.error(
      "Error updating region:",
      error
    );

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

  // ----------------------------------
  // Delete
  // ----------------------------------

  const { error } = await supabase
    .from("regions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error deleting region:",
      error
    );

    // Region is being used elsewhere
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "This region cannot be deleted because it is being used by another record.",
      };
    }

    return {
      success: false,
      error: "Failed to delete region.",
    };
  }

  return {
    success: true,
  };
}
