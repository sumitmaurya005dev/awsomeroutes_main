import { createClient } from "@/lib/supabase/server";
import type { Region, RegionStatus } from "@/types/region";

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface GetRegionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: RegionStatus | "all";
  countryId?: string;
  sortBy?: "name" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export interface RegionWithCountry extends Region {
  country: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface PaginatedRegions {
  data: RegionWithCountry[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

/**
 * Escape characters that have special meaning
 * inside Supabase/PostgREST filter expressions.
 */
function escapeSearchValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,");
}

// --------------------------------------------------
// Get Regions
// --------------------------------------------------

/**
 * Get paginated regions with:
 *
 * Search:
 * - region name
 * - region slug
 * - country name
 * - country slug
 * - country ISO code
 *
 * Filters:
 * - status
 * - country
 *
 * Sorting:
 * - name
 * - created_at
 * - updated_at
 *
 * Pagination:
 * - default 50 records
 */
export async function getRegions({
  page = 1,
  limit = 50,
  search = "",
  status = "all",
  countryId = "",
  sortBy = "name",
  sortOrder = "asc",
}: GetRegionsParams = {}): Promise<PaginatedRegions> {
  const supabase = await createClient();

  // --------------------------------------------------
  // Pagination safety
  // --------------------------------------------------

  const safePage =
    Number.isInteger(page) && page >= 1
      ? page
      : 1;

  const safeLimit = Math.min(
    Math.max(1, limit),
    100
  );

  const from =
    (safePage - 1) * safeLimit;

  const to =
    from + safeLimit - 1;

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const trimmedSearch =
    search.trim();

  let matchingCountryIds: string[] = [];

  if (trimmedSearch) {
    const escapedSearch =
      escapeSearchValue(
        trimmedSearch
      );

    /*
     * Search countries separately.
     *
     * This allows:
     *
     * Search: India
     *
     * Result:
     * India → Uttar Pradesh
     * India → Rajasthan
     * India → Gujarat
     *
     * It also supports:
     * - country name
     * - country slug
     * - ISO code
     */
    const {
      data: matchingCountries,
      error: countrySearchError,
    } = await supabase
      .from("countries")
      .select("id")
      .or(
        [
          `name.ilike.%${escapedSearch}%`,
          `slug.ilike.%${escapedSearch}%`,
          `iso_code.ilike.%${escapedSearch}%`,
        ].join(",")
      );

    if (countrySearchError) {
      console.error(
        "Error searching countries for regions:",
        countrySearchError
      );

      throw new Error(
        "Failed to search regions"
      );
    }

    matchingCountryIds =
      matchingCountries?.map(
        (country) => country.id
      ) ?? [];
  }

  // --------------------------------------------------
  // Base Query
  // --------------------------------------------------

  let query = supabase
    .from("regions")
    .select(
      `
        *,
        country:countries (
          id,
          name,
          slug
        )
      `,
      {
        count: "exact",
      }
    );

  // --------------------------------------------------
  // Status Filter
  // --------------------------------------------------

  if (status !== "all") {
    query = query.eq(
      "status",
      status
    );
  }

  // --------------------------------------------------
  // Country Filter
  // --------------------------------------------------

  if (countryId.trim()) {
    query = query.eq(
      "country_id",
      countryId
    );
  }

  // --------------------------------------------------
  // Search Filter
  // --------------------------------------------------

  if (trimmedSearch) {
    const escapedSearch =
      escapeSearchValue(
        trimmedSearch
      );

    const searchConditions: string[] = [
      `name.ilike.%${escapedSearch}%`,
      `slug.ilike.%${escapedSearch}%`,
    ];

    /*
     * If the search matches one or more
     * countries, include all regions
     * belonging to those countries.
     */
    if (
      matchingCountryIds.length > 0
    ) {
      for (const countryId of matchingCountryIds) {
        searchConditions.push(
          `country_id.eq.${countryId}`
        );
      }
    }

    query = query.or(
      searchConditions.join(",")
    );
  }

  // --------------------------------------------------
  // Sorting
  // --------------------------------------------------

  query = query.order(
  sortBy,
  {
    ascending: sortOrder === "asc",
  }
);

// Secondary sorting keeps pagination stable
// when multiple regions have the same name.
query = query.order(
  "id",
  {
    ascending: true,
  }
);

  // --------------------------------------------------
  // Pagination
  // --------------------------------------------------

  query = query.range(
    from,
    to
  );

  // --------------------------------------------------
  // Execute Query
  // --------------------------------------------------

  const {
    data,
    error,
    count,
  } = await query;

  if (error) {
    console.error(
      "Error fetching regions:",
      error
    );

    throw new Error(
      "Failed to fetch regions"
    );
  }

  const totalCount =
    count ?? 0;

  return {
    data:
      (data ?? []) as RegionWithCountry[],

    count: totalCount,

    page: safePage,

    limit: safeLimit,

    totalPages:
      Math.ceil(
        totalCount / safeLimit
      ),
  };
}

// --------------------------------------------------
// Get Region By ID
// --------------------------------------------------

export async function getRegionById(
  id: string
): Promise<RegionWithCountry | null> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("regions")
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
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Error fetching region:",
      error
    );

    throw new Error(
      "Failed to fetch region"
    );
  }

  return data as RegionWithCountry | null;
}

// --------------------------------------------------
// Get Region By Slug
// --------------------------------------------------

/**
 * Because regions has:
 *
 * UNIQUE(country_id, slug)
 *
 * the same slug can exist in
 * different countries.
 *
 * Example:
 *
 * country_id = India
 * slug = north
 *
 * country_id = USA
 * slug = north
 *
 * Therefore countryId is optional
 * but recommended when available.
 */
export async function getRegionBySlug(
  slug: string,
  countryId?: string
): Promise<RegionWithCountry | null> {
  const supabase =
    await createClient();

  let query = supabase
    .from("regions")
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
    .eq(
      "slug",
      slug
    );

  if (countryId) {
    query = query.eq(
      "country_id",
      countryId
    );
  }

  const {
    data,
    error,
  } = await query
    .order(
      "created_at",
      {
        ascending: true,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Error fetching region by slug:",
      error
    );

    throw new Error(
      "Failed to fetch region"
    );
  }

  return data as RegionWithCountry | null;
}