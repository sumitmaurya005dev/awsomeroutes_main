"use client";
import { Button } from "@/components/ui/button";
import type {
  ItineraryTransport,
  ItineraryReferences,
} from "@/types/custom-itinerary";
import { Select, Stepper, Check, Override, grid } from "./fields";
import {
  itineraryDayDate,
  formatItineraryDate,
} from "@/lib/custom-itineraries/dates";
export function TransportEditor({
  value: t,
  refs,
  days,
  travelDate,
  pricing,
  onChange,
  onRemove,
}: {
  value: ItineraryTransport;
  refs: ItineraryReferences;
  days: number;
  travelDate: string;
  pricing: boolean;
  onChange: (t: ItineraryTransport) => void;
  onRemove: () => void;
}) {
  const update = (p: Partial<ItineraryTransport>) => onChange({ ...t, ...p });
  return (
    <article className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex justify-between gap-2">
        <h3 className="font-semibold">Vehicle allocation</h3>
        <Button type="button" variant="ghost" onClick={onRemove}>
          Remove vehicle
        </Button>
      </div>
      <div className={grid}>
        <Select
          label="Booking base location"
          value={t.base_location_id}
          options={refs.locations.map((x) => ({
            id: x.id,
            name: x.name + " · " + (x.destination?.name ?? ""),
          }))}
          onChange={(v) =>
            update({
              base_location_id: v,
              vendor_id: null,
              driver_id: null,
              fleet_id: null,
            })
          }
        />
        <Select
          label="Vehicle category"
          value={t.category_id}
          options={refs.vehicle_categories}
          onChange={(v) =>
            update({ category_id: v, model_id: null, fleet_id: null })
          }
        />
        <Select
          label="Model"
          value={t.model_id}
          options={refs.vehicle_models.filter(
            (x) => x.category_id === t.category_id,
          )}
          nullable
          onChange={(v) => update({ model_id: v || null, fleet_id: null })}
        />
        <Select
          label="Vendor"
          value={t.vendor_id}
          options={refs.vehicle_vendors.filter(
            (x) => x.base_location_id === t.base_location_id,
          )}
          nullable
          onChange={(v) =>
            update({ vendor_id: v || null, driver_id: null, fleet_id: null })
          }
        />
        <Select
          label="Fleet vehicle"
          value={t.fleet_id}
          options={refs.fleet
            .filter(
              (x) => x.model_id === t.model_id && x.vendor_id === t.vendor_id,
            )
            .map((x) => ({ id: x.id, name: x.registration_number }))}
          nullable
          onChange={(v) =>
            update({ fleet_id: v || null, quantity: v ? 1 : t.quantity })
          }
        />
        <Select
          label="Driver"
          value={t.driver_id}
          options={refs.drivers
            .filter((x) => x.vendor_id === t.vendor_id)
            .map((x) => ({
              id: x.id,
              name: x.first_name + " " + (x.last_name ?? ""),
            }))}
          nullable
          onChange={(v) =>
            update({ driver_id: v || null, quantity: v ? 1 : t.quantity })
          }
        />
        <Stepper
          label="From day (inclusive)"
          min={1}
          max={days}
          value={t.start_day}
          onChange={(v) =>
            update({ start_day: v, end_day: Math.max(v, t.end_day) })
          }
        />
        <Stepper
          label="Through day (inclusive)"
          min={t.start_day}
          max={days}
          value={t.end_day}
          onChange={(v) => update({ end_day: v })}
        />
        <Stepper
          label="Number of vehicles"
          min={1}
          max={t.fleet_id || t.driver_id ? 1 : 20}
          value={t.quantity}
          onChange={(v) => update({ quantity: v })}
        />
      </div>
      <p
        role="status"
        className="rounded-lg bg-primary/10 p-3 text-sm font-medium"
      >
        {t.end_day - t.start_day + 1} billed days · {t.quantity} vehicle(s)
        {travelDate && (
          <>
            {" "}
            · {formatItineraryDate(
              itineraryDayDate(travelDate, t.start_day),
            )} – {formatItineraryDate(itineraryDayDate(travelDate, t.end_day))}
          </>
        )}
      </p>
      <Check
        label="Luggage-only vehicle (do not count its passenger seats)"
        value={t.luggage_only}
        onChange={(v) => update({ luggage_only: v })}
      />
      <p className="text-sm text-muted-foreground">
        Charged on every allocated day, including rest days. For a driver/car
        change, end this allocation and add another starting the next day.{" "}
        Available range: day 1–{days}. Add itinerary days above to extend the
        tour.
      </p>
      <Override
        value={t.override_total_paise}
        reason={t.override_reason}
        onChange={update}
        allowed={pricing}
      />
    </article>
  );
}
