// createCountry()
// updateCountry()
// deleteCountry()
//  we will build these logics here


// import { createClient } from "@/lib/supabase/server";
// import type {
//   Country,
//   CountryInsert,
//   CountryUpdate,
// } from "@/types/country";

// /**
//  * Create a new country.
//  */
// export async function createCountry(
//   payload: CountryInsert
// ): Promise<Country> {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("countries")
//     .insert(payload)
//     .select("*")
//     .single();

//   if (error) {
//     console.error("Error creating country:", error);
//     throw new Error(error.message || "Failed to create country");
//   }

//   return data;
// }

// /**
//  * Update an existing country.
//  */
// export async function updateCountry(
//   id: string,
//   payload: CountryUpdate
// ): Promise<Country> {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("countries")
//     .update(payload)
//     .eq("id", id)
//     .select("*")
//     .single();

//   if (error) {
//     console.error("Error updating country:", error);
//     throw new Error(error.message || "Failed to update country");
//   }

//   return data;
// }

// /**
//  * Delete a country.
//  */
// export async function deleteCountry(
//   id: string
// ): Promise<void> {
//   const supabase = await createClient();

//   const { error } = await supabase
//     .from("countries")
//     .delete()
//     .eq("id", id);

//   if (error) {
//     console.error("Error deleting country:", error);
//     throw new Error(error.message || "Failed to delete country");
//   }
// }

// /**
//  * Update country active/inactive status.
//  */
// export async function updateCountryStatus(
//   id: string,
//   status: Country["status"]
// ): Promise<Country> {
//   const supabase = await createClient();

//   const { data, error } = await supabase
//     .from("countries")
//     .update({ status })
//     .eq("id", id)
//     .select("*")
//     .single();

//   if (error) {
//     console.error("Error updating country status:", error);
//     throw new Error(
//       error.message || "Failed to update country status"
//     );
//   }

//   return data;
// }

// ---------------------------------------------new code  here-----------------------------------

import { createClient } from "@/lib/supabase/server";
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

  const { data, error } = await supabase
    .from("countries")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating country:", error);

    // PostgreSQL unique constraint violation
    if (error.code === "23505") {
      throw new Error(
        "A country with the same name, slug, or ISO code already exists.",
      );
    }

    throw new Error(error.message || "Failed to create country");
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

  const { data, error } = await supabase
    .from("countries")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating country:", error);

    // PostgreSQL unique constraint violation
    if (error.code === "23505") {
      throw new Error(
        "A country with the same name, slug, or ISO code already exists.",
      );
    }

    throw new Error(error.message || "Failed to update country");
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

  const { error } = await supabase
    .from("countries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting country:", error);

    throw new Error(
      error.message || "Failed to delete country",
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
    console.error("Error updating country status:", error);

    throw new Error(
      error.message || "Failed to update country status",
    );
  }

  if (!data) {
    throw new Error("Country status was not updated.");
  }

  return data;
}