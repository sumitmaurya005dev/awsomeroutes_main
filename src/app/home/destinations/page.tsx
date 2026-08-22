import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveRegions, getDestinations } from "@/lib/destinations/queries";
import { DestinationsTable } from "@/components/destinations/destinations-table";
import SearchInput from "@/components/common/search-input";
import FilterSelect from "@/components/common/filter-select";

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; regionId?: string }> }) {
  const params = await searchParams; const status = params.status === "active" || params.status === "inactive" ? params.status : "all"; const page = Math.max(1, Number(params.page) || 1); const search = params.search?.trim() ?? "";
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role_id, roles(slug)").eq("id", user.id).maybeSingle(); const role = (profile?.roles as { slug: string } | null)?.slug; const canManage = role === "super_admin" || role === "admin" || role === "manager";
  const [result, regions] = await Promise.all([getDestinations({ page, search, status, regionId: params.regionId ?? "" }), getActiveRegions()]); const regionOptions = regions.map((item) => ({ id: item.id, name: item.name, countryName: (item.country as { name: string } | null)?.name ?? "" }));
  return <div className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Destinations</h1><p className="mt-1 text-sm text-muted-foreground">Manage destination cities and travel areas.</p></div></div>{canManage && <Link href="/home/destinations/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add Destination</Link>}</div><div className="flex flex-wrap gap-2"><SearchInput placeholder="Search destinations..." className="w-full sm:w-64" /><FilterSelect paramName="status" defaultValue="all" options={[{ label: "All status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} className="w-40" /></div><DestinationsTable {...result} regions={regionOptions} canManage={canManage} /></div></div>;
}
