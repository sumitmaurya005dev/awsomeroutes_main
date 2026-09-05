import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getCustomItinerary,
  getItineraryReferences,
  getItineraryRevisions,
  itineraryPermissions,
} from "@/lib/custom-itineraries/queries";
import { quoteReference } from "@/lib/custom-itineraries/document";
import { ItineraryBuilder } from "@/components/custom-itineraries/itinerary-builder";
import { ItineraryActions } from "@/components/custom-itineraries/itinerary-actions";
import { QuotePreview } from "@/components/custom-itineraries/quote-preview";
import { PdfDownload } from "@/components/custom-itineraries/pdf-download";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const permissions = await itineraryPermissions();
  if (!permissions.view) notFound();
  const value = await getCustomItinerary(id);
  if (!value) notFound();
  const revisions = await getItineraryRevisions(id);
  const refs = value.status === "draft" ? await getItineraryReferences() : null;
  return (
    <main className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/home/custom-itineraries" className="text-sm underline">
        All itineraries
      </Link>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {quoteReference(value.quote_number)} · {value.status} · revision{" "}
          {value.current_revision}
        </p>
        <h1 className="text-2xl font-semibold">{value.title}</h1>
        <p className="text-sm text-muted-foreground">
          Prepared for {value.customer_name}
        </p>
      </header>
      {value.status !== "draft" && (
        <ItineraryActions value={value} permissions={permissions} />
      )}
      {refs && (
        <ItineraryBuilder
          key={value.id + "-" + value.version}
          initial={value}
          refs={refs}
          permissions={permissions}
          detail={value}
        />
      )}
      {revisions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Saved quotation revisions</h2>
          <p className="text-sm text-muted-foreground">
            These copies retain the original pricing, even when catalog rates
            change.
          </p>
          {revisions.map((r, i) => (
            <details
              key={r.id}
              open={i === 0 && value.status !== "draft"}
              className="rounded-xl border p-4"
            >
              <summary className="cursor-pointer font-medium">
                Revision {r.revision} · {r.created_at.slice(0, 10)}
              </summary>
              <div className="mt-4 space-y-4">
                {permissions.export && (
                  <PdfDownload id={id} revision={r.revision} />
                )}
                <QuotePreview document={r.document} />
              </div>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
