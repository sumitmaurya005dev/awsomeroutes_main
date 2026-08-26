import Link from "next/link";
import { notFound } from "next/navigation";
import { Hotel, Plus } from "lucide-react";
import SearchInput from "@/components/common/search-input";
import FilterSelect from "@/components/common/filter-select";
import { HotelsTable } from "@/components/hotels/hotels-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getHotels } from "@/lib/hotels/queries";
import { hasPermission } from "@/lib/auth";
import type { HotelStatus } from "@/types/hotel";
export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  if (!(await hasPermission("hotels.view"))) notFound();
  const p = await searchParams;
  const statuses = new Set([
    "draft",
    "active",
    "temporarily_unavailable",
    "inactive",
  ]);
  const status = statuses.has(p.status ?? "")
    ? (p.status as HotelStatus)
    : "all";
  const page = Math.max(1, Number(p.page) || 1);
  const [result, canCreate, canUpdate, canManagePricing, canDelete] =
    await Promise.all([
      getHotels({ page, search: p.search, status }),
      hasPermission("hotels.create"),
      hasPermission("hotels.update"),
      hasPermission("hotels.manage_pricing"),
      hasPermission("hotels.delete"),
    ]);
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/home" />}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Hotels</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Hotel className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">Hotels</h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {result.count} hotels
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage hotel content, room categories, occupancy and
                tax-inclusive rates.
              </p>
            </div>
          </div>
          {canCreate && (
            <Link
              href="/home/hotels/create"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Hotel
            </Link>
          )}
        </section>
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold">All Hotels</h2>
              <p className="text-sm text-muted-foreground">
                Search and manage all hotel products.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SearchInput
                placeholder="Search hotels..."
                className="w-full sm:w-64"
              />
              <FilterSelect
                paramName="status"
                defaultValue="all"
                options={[
                  { label: "All status", value: "all" },
                  { label: "Draft", value: "draft" },
                  { label: "Active", value: "active" },
                  {
                    label: "Temporarily unavailable",
                    value: "temporarily_unavailable",
                  },
                  { label: "Inactive", value: "inactive" },
                ]}
                className="w-52"
              />
            </div>
          </div>
          <HotelsTable
            {...result}
            canUpdate={canUpdate || canManagePricing}
            canDelete={canDelete}
          />
        </section>
      </div>
    </main>
  );
}
