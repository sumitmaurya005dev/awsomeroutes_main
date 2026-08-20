// getCountries()
// getCountryById()
// getCountryBySlug()
//  we will build these query logic here

import { createClient } from "@/lib/supabase/server";
import type { Country, CountryStatus } from "@/types/country";

export interface GetCountriesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CountryStatus | "all";
  sortBy?: "name" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedCountries {
  data: Country[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get paginated countries with search, filter and sorting.
 */
export async function getCountries({
  page = 1,
  limit = 50,
  search = "",
  status = "all",
  sortBy = "name",
  sortOrder = "asc",
}: GetCountriesParams = {}): Promise<PaginatedCountries> {
  
  const supabase = await createClient();

  // Safety limits
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = supabase
    .from("countries")
    .select("*", { count: "exact" });

  // ----------------------------------
  // Status filter
  // ----------------------------------

  if (status !== "all") {
    query = query.eq("status", status);
  }

  // ----------------------------------
  // Search
  // ----------------------------------

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const escapedSearch = trimmedSearch
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/,/g, "\\,");

    const searchFilters = [
      `name.ilike.%${escapedSearch}%`,
      `slug.ilike.%${escapedSearch}%`,
      `iso_code.ilike.%${escapedSearch}%`,
      `phone_code.ilike.%${escapedSearch}%`,
    ];

    // UUID search requires exact matching.
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmedSearch
      )
    ) {
      searchFilters.push(`id.eq.${trimmedSearch}`);
    }

    query = query.or(searchFilters.join(","));
  }

  // ----------------------------------
  // Sorting
  // ----------------------------------

  query = query.order(sortBy, {
    ascending: sortOrder === "asc",
  });

  // ----------------------------------
  // Pagination
  // ----------------------------------

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching countries:", error);
    throw new Error("Failed to fetch countries");
  }

  const totalCount = count ?? 0;

 

  return {
    data: data ?? [],
    count: totalCount,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(totalCount / safeLimit),
  };
}

/**
 * Get a single country by ID.
 */
export async function getCountryById(
  id: string
): Promise<Country | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching country:", error);
    throw new Error("Failed to fetch country");
  }

  return data;
}

/**
 * Get a single country by slug.
 */
export async function getCountryBySlug(
  slug: string
): Promise<Country | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Error fetching country by slug:", error);
    throw new Error("Failed to fetch country");
  }

  return data;
}