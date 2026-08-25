import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Plus } from "lucide-react";
import { ActivitiesTable } from "@/components/activities/activities-table";
import FilterSelect from "@/components/common/filter-select";
import SearchInput from "@/components/common/search-input";
import { getActivities, getActivityCategories } from "@/lib/activities/queries";
import { hasPermission } from "@/lib/auth";
import type { ActivityStatus } from "@/types/activity";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; categoryId?: string }> }) {
  if (!(await hasPermission("activities.view"))) notFound();
  const params = await searchParams;
  const allowedStatuses = new Set(["draft", "active", "temporarily_unavailable", "inactive"]);
  const status = allowedStatuses.has(params.status ?? "") ? params.status as ActivityStatus : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const [result, categories, canCreate, canUpdate, canManagePricing, canDelete] = await Promise.all([
    getActivities({ page, search: params.search?.trim(), status, categoryId: params.categoryId }),
    getActivityCategories(),
    hasPermission("activities.create"),
    hasPermission("activities.update"),
    hasPermission("activities.manage_pricing"),
    hasPermission("activities.delete"),
  ]);
  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Activity className="h-6 w-6" /></div><div><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">Activities</h1><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{result.count} activities</span></div><p className="mt-1 text-sm text-muted-foreground">Manage activity content, location-wise capacity and pricing.</p></div></div>{canCreate && <Link href="/home/activities/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add Activity</Link>}</section><section className="space-y-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-semibold">All Activities</h2><p className="text-sm text-muted-foreground">View and manage all activity products.</p></div><div className="grid gap-2 sm:grid-cols-3"><SearchInput placeholder="Search activities..." className="w-full sm:w-64" /><FilterSelect paramName="categoryId" defaultValue="all" options={[{ label: "All categories", value: "all" }, ...categories.map((category) => ({ label: category.name, value: category.id }))]} className="w-44" /><FilterSelect paramName="status" defaultValue="all" options={[{ label: "All status", value: "all" }, { label: "Draft", value: "draft" }, { label: "Active", value: "active" }, { label: "Temporarily unavailable", value: "temporarily_unavailable" }, { label: "Inactive", value: "inactive" }]} className="w-52" /></div></div><ActivitiesTable {...result} canUpdate={canUpdate || canManagePricing} canDelete={canDelete} /></section></div></main>;
}
