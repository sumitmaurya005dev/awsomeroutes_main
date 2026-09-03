import Link from "next/link";
import { notFound } from "next/navigation";
import { IndianRupee, MapPin } from "lucide-react";
import SearchInput from "@/components/common/search-input";
import FilterSelect from "@/components/common/filter-select";
import { HotelLocationPricing } from "@/components/hotels/hotel-location-pricing";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { hasPermission } from "@/lib/auth";
import { getHotelLocationPricingReferences, getHotelLocationRates } from "@/lib/hotels/queries";

export default async function HotelLocationPricingPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; locationId?: string }> }) {
  if (!(await hasPermission("hotels.manage_pricing"))) notFound();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const [result, references] = await Promise.all([
    getHotelLocationRates({ page, search: params.search, status, locationId: params.locationId }),
    getHotelLocationPricingReferences(),
  ]);
  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink render={<Link href="/home" />}>Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbLink render={<Link href="/home/hotels" />}>Hotels</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>Location Pricing</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><IndianRupee className="h-6 w-6"/></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Location Hotel Pricing</h1><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{result.count} rates</span></div><p className="mt-1 text-sm text-muted-foreground">Manage reusable category rates once. Hotels at the location inherit active defaults automatically.</p></div></div><Link href="/home/hotels" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted"><MapPin className="h-4 w-4"/>View hotels</Link></section><section className="space-y-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-semibold">Reusable defaults</h2><p className="text-sm text-muted-foreground">Unique per location, category and meal plan.</p></div><div className="grid gap-2 sm:grid-cols-2"><SearchInput placeholder="Search locations..." className="w-full sm:w-64"/><FilterSelect paramName="status" defaultValue="all" options={[{ label: "All status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} className="w-44"/></div></div><HotelLocationPricing {...result} locations={references.locations} categories={references.categories}/></section></div></main>;
}
