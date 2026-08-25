import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft } from "lucide-react";
import { ActivityForm } from "@/components/activities/activity-form";
import { ActivityFaqManager } from "@/components/activities/activity-faq-manager";
import { ActivityOfferingsManager } from "@/components/activities/activity-offerings-manager";
import {
  getActivityById,
  getActivityCategories,
} from "@/lib/activities/queries";
import { hasPermission } from "@/lib/auth";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    canView,
    canCreate,
    canUpdate,
    canManagePricing,
    canOverridePrice,
    canDelete,
    canBrowseMedia,
    canUploadMedia,
  ] = await Promise.all([
    hasPermission("activities.view"),
    hasPermission("activities.create"),
    hasPermission("activities.update"),
    hasPermission("activities.manage_pricing"),
    hasPermission("activities.override_price"),
    hasPermission("activities.delete"),
    hasPermission("media.view"),
    hasPermission("media.create"),
  ]);
  if (!canView || (!canCreate && !canUpdate && !canManagePricing)) notFound();
  const [activity, categories] = await Promise.all([
    getActivityById(id),
    getActivityCategories(),
  ]);
  if (!activity) notFound();
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/home/activities"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Activities
        </Link>
        <section className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Edit {activity.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage content, media, FAQs and independently-priced location
              offerings.
            </p>
          </div>
        </section>
        {canUpdate ? (
          <ActivityForm
            initial={activity}
            categories={categories}
            canBrowseMedia={canBrowseMedia}
            canUploadMedia={canUploadMedia}
          />
        ) : (
          <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Your role can manage activity pricing but cannot edit the activity
            content.
          </p>
        )}
        <ActivityOfferingsManager
          activityId={activity.id}
          offerings={activity.offerings}
          canAddOffering={canCreate || canManagePricing}
          canManagePricing={canManagePricing}
          canOverridePrice={canOverridePrice}
          canDelete={canDelete}
        />
        {canUpdate && (
          <ActivityFaqManager
            activityId={activity.id}
            faqs={activity.faqs}
            canUpdate
          />
        )}
      </div>
    </main>
  );
}
