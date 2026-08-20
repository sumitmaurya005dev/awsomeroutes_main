
import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";

import { getRegions } from "@/lib/regions/queries";

import { RegionsTable } from "@/components/regions/regions-table";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { createClient } from "@/lib/supabase/server";
import SearchInput from "@/components/common/search-input";
import SortSelect from "@/components/common/sort-select";
import FilterSelect from "@/components/common/filter-select";

interface RegionsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    status?: string;
    countryId?: string;
  }>;
}

export default async function RegionsPage({
  searchParams,
}: RegionsPageProps) {
  const params = await searchParams;

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const search = params.search?.trim() ?? "";

  // --------------------------------------------------
  // Status
  // --------------------------------------------------

  const statusParam = params.status ?? "all";

  const status =
    statusParam === "active" ||
    statusParam === "inactive"
      ? statusParam
      : "all";

  // --------------------------------------------------
  // Country
  // --------------------------------------------------

  const countryId = params.countryId?.trim() ?? "";

  // --------------------------------------------------
  // Sort
  // --------------------------------------------------

  const sortParam = params.sort ?? "name:asc";

  const [sortByParam, sortOrderParam] =
    sortParam.split(":");

  const allowedSortBy = [
    "name",
    "created_at",
    "updated_at",
  ] as const;

  const allowedSortOrder = [
    "asc",
    "desc",
  ] as const;

  const sortBy = allowedSortBy.includes(
    sortByParam as (typeof allowedSortBy)[number]
  )
    ? (sortByParam as (typeof allowedSortBy)[number])
    : "name";

  const sortOrder = allowedSortOrder.includes(
    sortOrderParam as (typeof allowedSortOrder)[number]
  )
    ? (sortOrderParam as (typeof allowedSortOrder)[number])
    : "asc";

  // --------------------------------------------------
  // Current page
  // --------------------------------------------------

  const requestedPage = Number(params.page);

  const currentPage =
    Number.isInteger(requestedPage) &&
    requestedPage >= 1
      ? requestedPage
      : 1;

  // --------------------------------------------------
  // Supabase
  // --------------------------------------------------

  const supabase = await createClient();

  // --------------------------------------------------
  // Current user
  // --------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // --------------------------------------------------
  // Get user's profile / role
  // --------------------------------------------------

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", user.id)
    .single();

  let roleSlug: string | null = null;

  if (profile?.role_id) {
    const { data: role } = await supabase
      .from("roles")
      .select("slug")
      .eq("id", profile.role_id)
      .single();

    roleSlug = role?.slug ?? null;
  }

  // --------------------------------------------------
  // Region management permission
  // --------------------------------------------------

  const canManageRegions =
    roleSlug === "admin" ||
    roleSlug === "super_admin";

  // --------------------------------------------------
  // Regions
  // --------------------------------------------------

  const {
    data,
    count,
    page,
    limit,
    totalPages,
  } = await getRegions({
    page: currentPage,
    limit: 50,
    search,
    status,
    countryId,
    sortBy,
    sortOrder,
  });

  // --------------------------------------------------
  // Countries for filter
  // --------------------------------------------------

  const { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .eq("status", "active")
    .order("name", {
      ascending: true,
    });

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    href="/home"
                    className="transition-colors hover:text-foreground"
                  />
                }
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <BreadcrumbPage>
                Regions
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">

          {/* Left */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPinned className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Regions
                </h1>

                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {count}{" "}
                  {count === 1
                    ? "region"
                    : "regions"}
                </span>
              </div>

              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Manage regions used across your travel platform.
              </p>
            </div>
          </div>

          {/* Add Region */}
          {canManageRegions && (
            <Link
              href="/home/regions/create"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" />
              Add Region
            </Link>
          )}
        </div>

        {/* Regions Section */}
        <section className="space-y-4">

          {/* Section Header + Controls */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            {/* Section Title */}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                All Regions
              </h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                View and manage all regions available in the system.
              </p>
            </div>

            {/* Search + Sort + Filter */}
            <div className="w-full min-w-0 lg:w-auto">
              <div className="grid w-full min-w-0 grid-cols-3 gap-2 lg:flex lg:items-center">

                {/* Search */}
                <div className="col-span-1 min-w-0 lg:w-[250px] lg:shrink-0">
                  <SearchInput
                    placeholder="Search regions..."
                    className="w-full"
                  />
                </div>

                {/* Sort */}
                <div className="col-span-1 min-w-0 lg:w-[190px] lg:shrink-0">
                  <SortSelect
                    options={[
                      {
                        label: "Name: A → Z",
                        value: "name:asc",
                      },
                      {
                        label: "Name: Z → A",
                        value: "name:desc",
                      },
                      {
                        label: "Newest first",
                        value: "created_at:desc",
                      },
                      {
                        label: "Oldest first",
                        value: "created_at:asc",
                      },
                      {
                        label: "Recently updated",
                        value: "updated_at:desc",
                      },
                      {
                        label: "Least recently updated",
                        value: "updated_at:asc",
                      },
                    ]}
                    defaultValue="name:asc"
                    className="w-full"
                  />
                </div>

                {/* Status Filter */}
                <div className="col-span-1 min-w-0 lg:w-[190px] lg:shrink-0">
                  <FilterSelect
                    options={[
                      {
                        label: "All status",
                        value: "all",
                      },
                      {
                        label: "Active",
                        value: "active",
                      },
                      {
                        label: "Inactive",
                        value: "inactive",
                      },
                    ]}
                    paramName="status"
                    defaultValue="all"
                    className="w-full"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Regions Table */}
          <RegionsTable
            data={data}
            count={count}
            page={page}
            limit={limit}
            totalPages={totalPages}
            canManage={canManageRegions}
          />

        </section>
      </div>
    </div>
  );
}

