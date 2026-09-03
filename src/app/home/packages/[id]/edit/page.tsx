import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  IndianRupee,
  MapPin,
  Package,
  Route,
  Settings2,
} from "lucide-react";
import { PackageCoreForm } from "@/components/packages/package-core-form";
import { PackageItineraryManager } from "@/components/packages/package-itinerary-manager";
import { PackageCommercialManager } from "@/components/packages/package-commercial-manager";
import { getPackageById, getPackageReferenceData } from "@/lib/packages/queries";
import { hasPermission } from "@/lib/auth";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    canView,
    canUpdate,
    canManagePricing,
    canPublish,
    canDelete,
    canBrowseMedia,
    canUploadMedia,
  ] = await Promise.all([
    hasPermission("packages.view"),
    hasPermission("packages.update"),
    hasPermission("packages.manage_pricing"),
    hasPermission("packages.publish"),
    hasPermission("packages.delete"),
    hasPermission("media.view"),
    hasPermission("media.create"),
  ]);

  if (!canView && !canUpdate && !canManagePricing && !canPublish) notFound();

  const [pkg, refs] = await Promise.all([
    getPackageById(id),
    getPackageReferenceData(),
  ]);
  if (!pkg) notFound();

  const permissions = {
    canCreate: false,
    canUpdate,
    canDelete,
    canManagePricing,
    canPublish,
    canBrowseMedia,
    canUploadMedia,
  };

  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/home/packages"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Packages
        </Link>

        <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Package />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{pkg.name}</h1>
                <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                  {pkg.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete package content, day-wise hotels and live pricing configuration.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-muted/50 px-3 py-2">
              <CalendarDays className="mx-auto mb-1 h-4 w-4 text-primary" />
              <b>{pkg.duration_days}D/{pkg.duration_nights}N</b>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2">
              <Route className="mx-auto mb-1 h-4 w-4 text-primary" />
              <b>{pkg.itinerary.length} days</b>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2">
              <MapPin className="mx-auto mb-1 h-4 w-4 text-primary" />
              <b>{pkg.destinations.length} stops</b>
            </div>
          </div>
        </section>

        <nav className="grid gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:grid-cols-3" aria-label="Package setup sections">
          <a href="#package-details" className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm transition hover:border-primary/40 hover:bg-primary/[0.03]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><Settings2 className="h-4 w-4" /></span>
            <span><b className="block">1. Package details</b><small className="text-muted-foreground">Basics, gallery and SEO</small></span>
          </a>
          <a href="#package-itinerary-hotels" className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-sm transition hover:bg-primary/[0.08]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><BedDouble className="h-4 w-4" /></span>
            <span><b className="block">2. Itinerary &amp; hotels</b><small className="text-muted-foreground">Day-wise stay and live rates</small></span>
          </a>
          <a href="#package-commercial-pricing" className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm transition hover:border-primary/40 hover:bg-primary/[0.03]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><IndianRupee className="h-4 w-4" /></span>
            <span><b className="block">3. Pricing &amp; content</b><small className="text-muted-foreground">Vehicles, FAQs and totals</small></span>
          </a>
        </nav>

        <div id="package-details" className="scroll-mt-24">
          {canUpdate ? (
            <PackageCoreForm initial={pkg} refs={refs} permissions={permissions} />
          ) : (
            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              Your role can view package configuration but cannot edit package content.
            </p>
          )}
        </div>

        <PackageItineraryManager pkg={pkg} refs={refs} canEdit={canUpdate} />
        <PackageCommercialManager
          pkg={pkg}
          refs={refs}
          canEdit={canUpdate}
          canManagePricing={canManagePricing}
        />
      </div>
    </main>
  );
}
