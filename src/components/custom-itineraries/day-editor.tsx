"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActivityPicker } from "./activity-picker";
import {
  itineraryDayDate,
  formatItineraryDate,
} from "@/lib/custom-itineraries/dates";
import type {
  ItineraryDay,
  ItineraryInput,
  ItineraryReferences,
} from "@/types/custom-itinerary";
import {
  Field,
  NumberField,
  Select,
  TextArea,
  Check,
  Override,
  grid,
} from "./fields";
export function DayEditor({
  day,
  group,
  refs,
  pricing,
  onChange,
  onRemove,
}: {
  day: ItineraryDay;
  group: ItineraryInput;
  refs: ItineraryReferences;
  pricing: boolean;
  onChange: (v: ItineraryDay) => void;
  onRemove: () => void;
}) {
  const [activityComposerOpen, setActivityComposerOpen] = useState(false);
  const [activityLocation, setActivityLocation] = useState("");
  const [activityNotice, setActivityNotice] = useState("");
  const patch = (p: Partial<ItineraryDay>) => onChange({ ...day, ...p });
  const locs = refs.locations.map((x) => ({
    id: x.id,
    name: x.name + (x.destination ? " · " + x.destination.name : ""),
  }));
  const overnight = refs.locations.find(
    (x) => x.id === day.overnight_location_id,
  );
  const hotels = refs.hotels.filter(
    (h) =>
      refs.locations.find((l) => l.id === h.location_id)?.destination?.id ===
      overnight?.destination?.id,
  );
  return (
    <article
      id={"day-" + day.id}
      tabIndex={-1}
      className="scroll-mt-24 space-y-5 rounded-2xl border bg-card p-4 shadow-sm focus:ring-2 focus:ring-primary sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Day {day.day_number}</h3>
        <Button type="button" variant="ghost" onClick={onRemove}>
          Remove day
        </Button>
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {formatItineraryDate(
          itineraryDayDate(group.travel_date, day.day_number),
        ) || "Select a travel start date to show this day's date."}
      </p>
      <div className={grid}>
        <Field
          label="Day title"
          value={day.title}
          required
          onChange={(title) => patch({ title })}
        />
        <Select
          label="Start location"
          value={day.start_location_id}
          options={locs}
          nullable
          onChange={(v) => patch({ start_location_id: v || null })}
        />
        <Select
          label="End location"
          value={day.end_location_id}
          options={locs}
          nullable
          onChange={(v) => patch({ end_location_id: v || null })}
        />
        <Select
          label="Overnight location"
          value={day.overnight_location_id}
          options={locs}
          nullable
          onChange={(v) => {
            if (
              day.stays.length &&
              !window.confirm(
                "Changing the overnight location removes this day's hotel selections. Continue?",
              )
            )
              return;
            patch({ overnight_location_id: v || null, stays: [] });
          }}
        />
        <Field
          label="Travel distance (km)"
          type="number"
          min={0}
          max={5000}
          step={0.1}
          value={day.distance_km ?? ""}
          onChange={(v) => patch({ distance_km: v === "" ? null : Number(v) })}
        />
        <Field
          label="Travel duration (minutes)"
          type="number"
          min={0}
          max={1440}
          step={1}
          value={day.travel_minutes ?? ""}
          onChange={(v) =>
            patch({ travel_minutes: v === "" ? null : Number(v) })
          }
        />
      </div>
      <TextArea
        label="Day-wise itinerary"
        value={day.description}
        onChange={(description) => patch({ description })}
      />
      <div className="flex flex-wrap gap-5">
        {(["breakfast", "lunch", "dinner"] as const).map((key) => (
          <Check
            key={key}
            label={key[0].toUpperCase() + key.slice(1) + " included"}
            value={day[key]}
            onChange={(v) => patch({ [key]: v })}
          />
        ))}
      </div>
      <section className="space-y-3">
        <h4 className="font-semibold">Overnight accommodation</h4>
        {!day.stays.length && (
          <p className="text-sm text-muted-foreground">
            Select an overnight location, then assign the hotel, room and guests
            for this night.
          </p>
        )}
        {day.stays.map((s, index) => {
          const update = (p: Partial<typeof s>) =>
            patch({
              stays: day.stays.map((x) => (x.id === s.id ? { ...s, ...p } : x)),
            });
          return (
            <div
              key={s.id}
              className="space-y-4 rounded-xl border bg-background/60 p-4"
            >
              <div className="flex items-center justify-between">
                <h5 className="font-medium">Stay {index + 1}</h5>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    patch({ stays: day.stays.filter((x) => x.id !== s.id) })
                  }
                >
                  Remove stay
                </Button>
              </div>
              <div className={grid}>
                <Select
                  label="Hotel"
                  value={s.hotel_id}
                  options={hotels}
                  onChange={(v) => update({ hotel_id: v, room_id: null })}
                />
                <Select
                  label="Category"
                  value={s.category_id}
                  options={refs.hotel_categories}
                  onChange={(v) => update({ category_id: v, room_id: null })}
                />
                <Select
                  label="Room"
                  value={s.room_id}
                  options={refs.rooms.filter(
                    (r) =>
                      r.hotel_id === s.hotel_id &&
                      r.category_id === s.category_id,
                  )}
                  nullable
                  onChange={(v) => update({ room_id: v || null })}
                />
                <Select
                  label="Meal plan"
                  value={s.meal_plan}
                  options={[
                    { id: "EP", name: "EP · Room only" },
                    { id: "CP", name: "CP · Breakfast" },
                    { id: "MAP", name: "MAP · Breakfast + one meal" },
                    { id: "AP", name: "AP · All meals" },
                  ]}
                  onChange={(v) =>
                    update({ meal_plan: v as typeof s.meal_plan })
                  }
                />
                <NumberField
                  label="Adults in this stay"
                  min={1}
                  value={s.adults}
                  onChange={(v) => update({ adults: v })}
                />
                <NumberField
                  label="Rooms for this night"
                  min={1}
                  value={s.rooms}
                  onChange={(v) => update({ rooms: v })}
                />
                <NumberField
                  label="Adult extra beds"
                  value={s.extra_adult_beds}
                  onChange={(v) => update({ extra_adult_beds: v })}
                />
                <NumberField
                  label="Children with extra bed (5–11)"
                  value={s.children_with_bed}
                  onChange={(v) => update({ children_with_bed: v })}
                />
                <NumberField
                  label="Children sharing bed (5–11)"
                  value={s.children_without_bed}
                  onChange={(v) => update({ children_without_bed: v })}
                />
                <NumberField
                  label="Infants sharing (0–4)"
                  value={s.infants}
                  onChange={(v) => update({ infants: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Rate priority: room override → hotel override → location
                default. Room and child capacity rules are checked before
                finalization.
              </p>
              <Override
                value={s.override_total_paise}
                reason={s.override_reason}
                onChange={update}
                allowed={pricing}
              />
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={!day.overnight_location_id || day.stays.length >= 20}
          onClick={() =>
            patch({
              stays: [
                ...day.stays,
                {
                  id: crypto.randomUUID(),
                  hotel_id: "",
                  category_id: "",
                  room_id: null,
                  meal_plan: "CP",
                  adults: Math.max(
                    1,
                    group.adults - day.stays.reduce((n, s) => n + s.adults, 0),
                  ),
                  rooms: Math.max(1, Math.ceil(group.adults / 2)),
                  extra_adult_beds: 0,
                  children_with_bed: Math.max(
                    0,
                    group.children -
                      day.stays.reduce(
                        (n, s) =>
                          n + s.children_with_bed + s.children_without_bed,
                        0,
                      ),
                  ),
                  children_without_bed: 0,
                  infants: Math.max(
                    0,
                    group.infants -
                      day.stays.reduce((n, s) => n + s.infants, 0),
                  ),
                  override_total_paise: null,
                  override_reason: "",
                },
              ],
            })
          }
        >
          Add hotel stay
        </Button>
      </section>
      <section className="space-y-3">
        <div>
          <h4 className="font-semibold">Selected activities</h4>
          <p className="text-sm text-muted-foreground">
            Only activities explicitly added below are included on day{" "}
            {day.day_number}.
          </p>
        </div>
        {day.activities.length === 0 && (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            No activity selected for this day.
          </p>
        )}
        {day.activities.map((a, index) => {
          const o = refs.activity_offerings.find((x) => x.id === a.offering_id);
          const update = (p: Partial<typeof a>) =>
            patch({
              activities: day.activities.map((x) =>
                x.id === a.id ? { ...a, ...p } : x,
              ),
            });
          return (
            <div
              key={a.id}
              id={"activity-" + a.id}
              tabIndex={-1}
              className="scroll-mt-24 space-y-4 rounded-xl border bg-background/60 p-4 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium">
                    {index + 1}. {o?.activity?.name ?? "Unavailable activity"}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    {o?.location?.name ?? "Unknown location"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    patch({
                      activities: day.activities.filter((x) => x.id !== a.id),
                    })
                  }
                >
                  Remove activity
                </Button>
              </div>
              <div className={grid}>
                <Select
                  label="Variant / zone"
                  value={a.variant_id}
                  options={(o?.variants ?? []).filter(
                    (x) => x.status === "active",
                  )}
                  nullable
                  onChange={(v) =>
                    update({ variant_id: v || null, optional_charge_ids: [] })
                  }
                />
                <NumberField
                  label="Adults participating"
                  value={a.adults}
                  onChange={(v) => update({ adults: v })}
                />
                <NumberField
                  label="Children participating"
                  value={a.children}
                  onChange={(v) => update({ children: v })}
                />
                <NumberField
                  label="Infants participating"
                  value={a.infants}
                  onChange={(v) => update({ infants: v })}
                />
                <NumberField
                  label="Number of sessions"
                  min={1}
                  max={20}
                  value={a.quantity}
                  onChange={(v) => update({ quantity: v })}
                />
                {o?.pricing_model === "per_unit" && (
                  <Field
                    label="Units (blank = calculated from capacity)"
                    type="number"
                    min={1}
                    max={100}
                    value={a.units ?? ""}
                    onChange={(v) =>
                      update({ units: v === "" ? null : Number(v) })
                    }
                  />
                )}
              </div>
              <Check
                label="Optional activity — exclude from quotation total"
                value={a.optional}
                onChange={(v) => update({ optional: v })}
              />
              {(o?.charges ?? [])
                .filter(
                  (c) =>
                    c.status === "active" &&
                    !c.mandatory &&
                    (!c.activity_variant_id ||
                      c.activity_variant_id === a.variant_id),
                )
                .map((c) => (
                  <Check
                    key={c.id}
                    label={"Include " + c.name}
                    value={a.optional_charge_ids.includes(c.id)}
                    onChange={(v) =>
                      update({
                        optional_charge_ids: v
                          ? [...a.optional_charge_ids, c.id]
                          : a.optional_charge_ids.filter((x) => x !== c.id),
                      })
                    }
                  />
                ))}
              <Override
                value={a.override_total_paise}
                reason={a.override_reason}
                onChange={update}
                allowed={pricing}
              />
            </div>
          );
        })}
        {activityComposerOpen ? (
          <div className="space-y-4 rounded-xl border border-primary bg-primary/5 p-4">
            <div>
              <h5 className="font-semibold">
                Add activity to day {day.day_number}
              </h5>
              <p className="text-sm text-muted-foreground">
                Choose a location, search, then add only the activities you
                want.
              </p>
            </div>
            <Select
              label="Activity location"
              value={activityLocation}
              options={locs}
              onChange={(location) => {
                setActivityLocation(location);
                setActivityNotice("");
              }}
            />
            {activityLocation ? (
              <ActivityPicker
                key={activityLocation}
                selectedIds={day.activities.map(
                  (activity) => activity.offering_id,
                )}
                options={refs.activity_offerings
                  .filter((x) => x.location_id === activityLocation)
                  .map((x) => ({
                    id: x.id,
                    name: x.activity?.name ?? "Activity",
                    available:
                      x.status === "active" && x.activity?.status === "active",
                    unavailableReason:
                      x.activity?.status !== "active"
                        ? `Activity is ${x.activity?.status ?? "unavailable"}. Activate it first.`
                        : `Offering is ${x.status}. Activate it first.`,
                    editHref: x.activity?.id
                      ? `/home/activities/${x.activity.id}/edit`
                      : undefined,
                  }))}
                onAdd={(offeringId) => {
                  const id = crypto.randomUUID();
                  const offering = refs.activity_offerings.find(
                    (item) => item.id === offeringId,
                  );
                  patch({
                    activities: [
                      ...day.activities,
                      {
                        id,
                        offering_id: offeringId,
                        variant_id: null,
                        adults: group.adults,
                        children: group.children,
                        infants: group.infants,
                        quantity: 1,
                        units: null,
                        optional: false,
                        optional_charge_ids: [],
                        override_total_paise: null,
                        override_reason: "",
                      },
                    ],
                  });
                  setActivityNotice(
                    `${offering?.activity?.name ?? "Activity"} added to day ${day.day_number}. Its price is included in live costing. Choose another location or activity to add more.`,
                  );
                }}
                onRemove={(offeringId) => {
                  patch({
                    activities: day.activities.filter(
                      (activity) => activity.offering_id !== offeringId,
                    ),
                  });
                  setActivityNotice(
                    `Activity removed from day ${day.day_number}. Live costing has been updated.`,
                  );
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a location before searching activities.
              </p>
            )}
            {activityNotice && (
              <p
                role="status"
                className="rounded-lg border bg-background p-3 text-sm"
              >
                {activityNotice}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActivityComposerOpen(false);
                  setActivityLocation("");
                  setActivityNotice("");
                }}
              >
                Done adding activities
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={day.activities.length >= 30}
            onClick={() => setActivityComposerOpen(true)}
          >
            Search and add activity
          </Button>
        )}
      </section>
    </article>
  );
}
