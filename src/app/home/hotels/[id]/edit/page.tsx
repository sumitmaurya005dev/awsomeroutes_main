import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  Hotel,
  IndianRupee,
  MapPin,
} from "lucide-react";
import { HotelForm } from "@/components/hotels/hotel-form";
import { HotelManagementPanels } from "@/components/hotels/hotel-management-panels";
import { getHotelById, getHotelReferenceData } from "@/lib/hotels/queries";
import { hasPermission } from "@/lib/auth";
export default async function EditHotelPage({
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
    hasPermission("hotels.view"),
    hasPermission("hotels.create"),
    hasPermission("hotels.update"),
    hasPermission("hotels.manage_pricing"),
    hasPermission("hotels.override_price"),
    hasPermission("hotels.delete"),
    hasPermission("media.view"),
    hasPermission("media.create"),
  ]);
  if (!canView && !canCreate && !canUpdate && !canManagePricing) notFound();
  const [hotel, { categories, amenities }] = await Promise.all([
    getHotelById(id),
    getHotelReferenceData(),
  ]);
  if (!hotel) notFound();
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/home/hotels"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hotels
        </Link>
        <section className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Hotel />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{hotel.name}</h1>
              <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                {hotel.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Hotel content, rooms, child policies and package-ready pricing.
            </p>
          </div>
        </section>
        <section className="grid overflow-hidden rounded-2xl border bg-card shadow-sm sm:grid-cols-3">
          <div className="flex items-center gap-3 border-b p-4 sm:border-b-0 sm:border-r">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="truncate text-sm font-semibold">
                {hotel.location?.name ?? "Not assigned"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b p-4 sm:border-b-0 sm:border-r">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <BedDouble className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Room types</p>
              <p className="text-sm font-semibold">
                {hotel.rooms.length} configured
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Rate cards</p>
              <p className="text-sm font-semibold">
                {hotel.rates.length} available
              </p>
            </div>
          </div>
        </section>
        {canUpdate ? (
          <HotelForm
            initial={hotel}
            amenities={amenities}
            canBrowseMedia={canBrowseMedia}
            canUploadMedia={canUploadMedia}
          />
        ) : (
          <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Your role can manage pricing but cannot edit hotel content.
          </p>
        )}
        <HotelManagementPanels
          hotel={hotel}
          categories={categories}
          canAddRoom={canCreate || canUpdate}
          canUpdate={canUpdate}
          canManagePricing={canManagePricing}
          canOverridePrice={canOverridePrice}
          canDelete={canDelete}
          canBrowseMedia={canBrowseMedia}
          canUploadMedia={canUploadMedia}
        />
      </div>
    </main>
  );
}
