import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft } from "lucide-react";
import { ActivityForm } from "@/components/activities/activity-form";
import { getActivityCategories } from "@/lib/activities/queries";
import { hasPermission } from "@/lib/auth";

export default async function CreateActivityPage() {
  if (!(await hasPermission("activities.create"))) notFound();
  const [categories, canBrowseMedia, canUploadMedia] = await Promise.all([getActivityCategories(), hasPermission("media.view"), hasPermission("media.create")]);
  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8"><Link href="/home/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Activities</Link><section className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Activity className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Add Activity</h1><p className="mt-1 text-sm text-muted-foreground">Create content first; location-wise pricing is configured after saving.</p></div></section><ActivityForm categories={categories} canBrowseMedia={canBrowseMedia} canUploadMedia={canUploadMedia} /></div></main>;
}
