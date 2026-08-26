import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Building2, Hotel, IndianRupee } from "lucide-react";
import { HotelForm } from "@/components/hotels/hotel-form";
import { getHotelReferenceData } from "@/lib/hotels/queries";
import { hasPermission } from "@/lib/auth";
export default async function CreateHotelPage() {
  if (!(await hasPermission("hotels.create"))) notFound();
  const [{ amenities }, canBrowseMedia, canUploadMedia] = await Promise.all([
    getHotelReferenceData(),
    hasPermission("media.view"),
    hasPermission("media.create"),
  ]);
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
        <section className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Hotel />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Add Hotel</h1>
            <p className="text-sm text-muted-foreground">
              Create hotel content first; rooms and pricing are configured after
              saving.
            </p>
          </div>
        </section>
        <div className="grid overflow-hidden rounded-2xl border bg-card shadow-sm sm:grid-cols-3">
          {[
            { icon: Building2, step: "01", title: "Hotel details", active: true },
            { icon: BedDouble, step: "02", title: "Room types", active: false },
            { icon: IndianRupee, step: "03", title: "Pricing", active: false },
          ].map(({ icon: Icon, step, title, active }) => (
            <div
              key={step}
              className={`flex items-center gap-3 border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${
                active ? "bg-primary/5" : "bg-muted/10"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step}
                </p>
                <p className="text-sm font-medium">{title}</p>
              </div>
            </div>
          ))}
        </div>
        <HotelForm
          amenities={amenities}
          canBrowseMedia={canBrowseMedia}
          canUploadMedia={canUploadMedia}
        />
      </div>
    </main>
  );
}
