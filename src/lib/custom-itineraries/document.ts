import { itineraryDayDate } from "./dates.ts";
import type {
  ItineraryDetail,
  ItineraryCalculation,
  ItineraryReferences,
  QuoteDocument,
} from "../../types/custom-itinerary";
export const quoteReference = (n: number) =>
  "AR-Q-" + String(n).padStart(6, "0");
export function makeQuoteDocument(
  v: ItineraryDetail,
  c: ItineraryCalculation,
  refs: ItineraryReferences,
  issuedAt: string,
): QuoteDocument {
  const location = (id: string | null) =>
    refs.locations.find((x) => x.id === id)?.name ?? "";
  const costs: QuoteDocument["costs"] = [];
  if (v.show_hotel_cost)
    costs.push({ label: "Hotel accommodation", amount_paise: c.hotel_paise });
  if (v.show_activity_cost)
    costs.push({
      label: "Included activities",
      amount_paise: c.activity_paise,
    });
  if (v.show_vehicle_cost)
    costs.push({ label: "Vehicle allocation", amount_paise: c.vehicle_paise });
  return {
    schema_version: 1,
    reference: quoteReference(v.quote_number),
    revision: v.current_revision + 1,
    title: v.title,
    customer_name: v.customer_name,
    customer_email: v.customer_email,
    customer_phone: v.customer_phone,
    travel_date: v.travel_date,
    valid_until: v.valid_until,
    guests: `${v.adults} adults · ${v.children} children (5–11) · ${v.infants} infants (0–4)`,
    issued_at: issuedAt,
    public_notes: v.public_notes,
    terms: v.terms,
    days: v.days.map((d) => ({
      day_number: d.day_number,
      date: itineraryDayDate(v.travel_date, d.day_number),
      title: d.title,
      description: d.description,
      route: [location(d.start_location_id), location(d.end_location_id)]
        .filter(Boolean)
        .join(" → "),
      overnight: location(d.overnight_location_id),
      meals: [
        d.breakfast ? "Breakfast" : "",
        d.lunch ? "Lunch" : "",
        d.dinner ? "Dinner" : "",
      ]
        .filter(Boolean)
        .join(", "),
      distance_km: d.distance_km,
      travel_minutes: d.travel_minutes,
      services: c.lines
        .filter((l) =>
          l.kind === "vehicle"
            ? v.transport.some(
                (t) =>
                  t.id === l.id &&
                  t.start_day <= d.day_number &&
                  t.end_day >= d.day_number,
              )
            : l.day === d.day_number,
        )
        .map((l) => ({
          label: l.label,
          detail: l.detail,
          optional: l.optional,
        })),
    })),
    costs,
    total_paise: c.total_paise,
    advance_paise: c.advance_paise,
    balance_paise: c.balance_paise,
  };
}
