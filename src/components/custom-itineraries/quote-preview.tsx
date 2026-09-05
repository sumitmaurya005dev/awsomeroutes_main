import type { QuoteDocument } from "@/types/custom-itinerary";
import {
  formatItineraryDate,
  itineraryDayDate,
} from "@/lib/custom-itineraries/dates";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n / 100,
  );
export function QuotePreview({ document: d }: { document: QuoteDocument }) {
  return (
    <article className="space-y-6 rounded-2xl border bg-card p-5 sm:p-8">
      <header className="space-y-2 border-b pb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Awesomeroutes · {d.reference} · Revision {d.revision}
        </p>
        <h2 className="text-2xl font-semibold">{d.title}</h2>
        <p>Prepared for {d.customer_name}</p>
        <p className="text-sm text-muted-foreground">
          Travel: {d.travel_date} · Valid until: {d.valid_until}
          <br />
          {d.guests}
        </p>
      </header>
      {d.days.map((day) => (
        <section key={day.day_number} className="space-y-3 border-b pb-5">
          <h3 className="text-lg font-semibold">
            Day {day.day_number} · {day.title}
          </h3>
          <p className="text-sm font-medium">
            {formatItineraryDate(
              day.date ?? itineraryDayDate(d.travel_date, day.day_number),
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {day.route}
            {day.distance_km !== null ? " · " + day.distance_km + " km" : ""}
            {day.travel_minutes !== null
              ? " · " + day.travel_minutes + " min"
              : ""}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {day.description}
          </p>
          {day.overnight && (
            <p className="text-sm">Overnight: {day.overnight}</p>
          )}
          {day.meals && <p className="text-sm">Meals: {day.meals}</p>}
          <ul className="space-y-2">
            {day.services.map((s, i) => (
              <li key={i} className="rounded-lg bg-muted/50 p-3 text-sm">
                <b>
                  {s.label}
                  {s.optional ? " (optional, not included)" : ""}
                </b>
                <p className="text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="space-y-3">
        <h3 className="font-semibold">Quotation for the entire group</h3>
        {d.costs.map((c) => (
          <div
            key={c.label}
            className="flex flex-wrap justify-between gap-3 text-sm"
          >
            <span>{c.label}</span>
            <b>{money(c.amount_paise)}</b>
          </div>
        ))}
        {d.costs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Selected component costs are shown for reference. Final group total
            includes quotation adjustments.
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-3 rounded-xl bg-primary/10 p-4 text-xl font-semibold">
          <span>Group total</span>
          <span>{money(d.total_paise)}</span>
        </div>
        <p className="text-sm">
          Advance requested: {money(d.advance_paise)} · Balance:{" "}
          {money(d.balance_paise)}
        </p>
      </section>
      {d.public_notes && (
        <section>
          <h3 className="mb-2 font-semibold">Notes</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {d.public_notes}
          </p>
        </section>
      )}
      {d.terms && (
        <section>
          <h3 className="mb-2 font-semibold">Inclusions, exclusions & terms</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {d.terms}
          </p>
        </section>
      )}
    </article>
  );
}
