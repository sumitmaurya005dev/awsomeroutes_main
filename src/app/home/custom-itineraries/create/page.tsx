import { notFound } from "next/navigation";
import { ItineraryBuilder } from "@/components/custom-itineraries/itinerary-builder";
import {
  getItineraryReferences,
  getClonePackages,
  itineraryPermissions,
} from "@/lib/custom-itineraries/queries";
import { emptyItinerary } from "@/lib/custom-itineraries/validation";
export default async function Page() {
  const p = await itineraryPermissions();
  if (!p.view || !p.create) notFound();
  const [refs, templates] = await Promise.all([
    getItineraryReferences(),
    getClonePackages(),
  ]);
  return (
    <main className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Create custom itinerary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build a customer-specific tour from scratch or an existing package.
        </p>
      </header>
      <ItineraryBuilder
        initial={emptyItinerary()}
        refs={refs}
        permissions={p}
        templates={templates}
      />
    </main>
  );
}
