import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPinned, Plus } from "lucide-react";
import { hasPermission } from "@/lib/auth";
import { getActiveDestinations, getLocations } from "@/lib/locations/queries";
import { LocationsTable } from "@/components/locations/locations-table";
import SearchInput from "@/components/common/search-input";
import FilterSelect from "@/components/common/filter-select";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; destinationId?: string }> }) {
  if (!(await hasPermission("locations.view"))) notFound();
  const params = await searchParams;
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const [result, destinations, canCreate, canUpdate, canDelete] = await Promise.all([
    getLocations({ page, search: params.search?.trim() ?? "", status, destinationId: params.destinationId ?? "" }),
    getActiveDestinations(),
    hasPermission("locations.create"),
    hasPermission("locations.update"),
    hasPermission("locations.delete"),
  ]);
  const options = destinations.map((item) => ({ id: item.id, name: item.name, regionName: (item.region as { name: string } | null)?.name ?? "" }));
  return <div className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><MapPinned className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Locations</h1><p className="mt-1 text-sm text-muted-foreground">Manage places, attractions and activity spots.</p></div></div>{canCreate && <Link href="/home/locations/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add Location</Link>}</div><div className="flex flex-wrap gap-2"><SearchInput placeholder="Search locations..." className="w-full sm:w-64" /><FilterSelect paramName="status" defaultValue="all" options={[{ label: "All status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} className="w-40" /></div><LocationsTable {...result} destinations={options} canUpdate={canUpdate} canDelete={canDelete} /></div></div>;
}
