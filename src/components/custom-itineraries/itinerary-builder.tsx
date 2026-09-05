"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  saveCustomItinerary,
  clonePackageIntoItinerary,
} from "@/lib/custom-itineraries/actions";
import { calculateItinerary } from "@/lib/custom-itineraries/pricing";
import { makeQuoteDocument } from "@/lib/custom-itineraries/document";
import { QuotePreview } from "./quote-preview";
import { itinerarySchema } from "@/lib/custom-itineraries/validation";
import type {
  ItineraryInput,
  ItineraryReferences,
  ItineraryPermissions,
  ItineraryDetail,
} from "@/types/custom-itinerary";
import { ItineraryActions } from "./itinerary-actions";
import { DayEditor } from "./day-editor";
import { TransportEditor } from "./transport-editor";
import {
  Field,
  NumberField,
  Money,
  Select,
  TextArea,
  Check,
  grid,
  inr,
} from "./fields";
export function ItineraryBuilder({
  initial,
  refs,
  permissions,
  templates = [],
  detail,
}: {
  initial: ItineraryInput;
  refs: ItineraryReferences;
  permissions: ItineraryPermissions;
  templates?: { id: string; name: string; duration_days?: number }[];
  detail?: ItineraryDetail;
}) {
  const [value, setValue] = useState(initial),
    [saved, setSaved] = useState(JSON.stringify(initial)),
    [pending, startTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIssuedAt] = useState(() => new Date().toISOString());
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [packageId, setPackageId] = useState(""),
    [categoryId, setCategoryId] = useState("");
  const errorRef = useRef<HTMLDivElement>(null),
    router = useRouter(),
    dirty = JSON.stringify(value) !== saved;
  const editable = initial.version ? permissions.update : permissions.create;
  const pricing = useMemo(() => {
    try {
      return { result: calculateItinerary(value, refs), error: "" };
    } catch (e) {
      return {
        result: null,
        error: e instanceof Error ? e.message : "Could not calculate pricing.",
      };
    }
  }, [value, refs]);
  const preview = useMemo(() => {
    if (!pricing.result) return null;
    const document = makeQuoteDocument(
      {
        ...value,
        quote_number: detail?.quote_number ?? 0,
        current_revision: detail?.current_revision ?? 0,
        status: "draft",
        created_at: detail?.created_at ?? previewIssuedAt,
        updated_at: previewIssuedAt,
      },
      pricing.result,
      refs,
      previewIssuedAt,
    );
    return {
      ...document,
      reference: detail ? document.reference + " · DRAFT" : "DRAFT",
    };
  }, [value, detail, pricing.result, refs, previewIssuedAt]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    const guardNavigation = (event: MouseEvent) => {
      if (!dirty || !(event.target instanceof Element)) return;
      const anchor = event.target.closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash
      )
        return;
      if (!window.confirm("Leave without saving these itinerary changes?")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", guardNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardNavigation, true);
    };
  }, [dirty]);
  function patch(p: Partial<ItineraryInput>) {
    setValue((v) => ({ ...v, ...p }));
    setNotice("");
  }
  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  function save() {
    setError("");
    setNotice("");
    const parsed = itinerarySchema.safeParse(value);
    if (!parsed.success) {
      showError(
        parsed.error.issues
          .slice(0, 8)
          .map((x) => x.path.join(" → ") + ": " + x.message)
          .join("\n"),
      );
      return;
    }
    startTransition(async () => {
      try {
        const result = await saveCustomItinerary(parsed.data);
        if (!result.success) {
          showError(result.error);
          return;
        }
        const next = { ...parsed.data, version: result.data.version };
        setValue(next);
        setSaved(JSON.stringify(next));
        setNotice(
          "Draft saved. Review the pricing warnings before finalizing.",
        );
        if (!initial.version)
          router.replace("/home/custom-itineraries/" + result.data.id);
        else router.refresh();
      } catch {
        showError(
          "Connection interrupted. Your form is unchanged. Check whether the save completed in another tab before retrying.",
        );
      }
    });
  }
  function clone() {
    if (
      (value.days.length || value.transport.length) &&
      !window.confirm(
        "Replace the current days, vehicles and terms with the selected package?",
      )
    )
      return;
    startTransition(async () => {
      try {
        const result = await clonePackageIntoItinerary(packageId, categoryId, {
          adults: value.adults,
          children: value.children,
          infants: value.infants,
        });
        if (!result.success) {
          showError(result.error);
          return;
        }
        patch(result.data);
        setNotice(
          "Package copied. Review hotel selections, occupancy, optional activities and vehicle capacity before saving.",
        );
      } catch {
        showError(
          "Could not copy the package. Your existing form has been preserved.",
        );
      }
    });
  }
  function addDay() {
    const id = crypto.randomUUID();
    patch({
      days: [
        ...value.days,
        {
          id,
          day_number: value.days.length + 1,
          title: "Day " + (value.days.length + 1),
          description: "",
          start_location_id: value.days.at(-1)?.end_location_id ?? null,
          end_location_id: null,
          overnight_location_id: null,
          distance_km: null,
          travel_minutes: null,
          breakfast: false,
          lunch: false,
          dinner: false,
          stays: [],
          activities: [],
        },
      ],
    });
    requestAnimationFrame(() => {
      const el = document.getElementById("day-" + id);
      el?.focus();
      el?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/home/custom-itineraries"
          className="text-sm underline underline-offset-4"
        >
          Back to all itineraries
        </Link>
        <span className="text-sm text-muted-foreground">
          {dirty
            ? "Unsaved changes"
            : initial.version
              ? "Saved draft"
              : "New itinerary"}
        </span>
      </div>
      <div
        ref={errorRef}
        tabIndex={-1}
        role={error ? "alert" : undefined}
        className={
          error
            ? "whitespace-pre-wrap rounded-xl border border-destructive bg-destructive/5 p-4 text-sm text-destructive"
            : ""
        }
      >
        {error}
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-xl border bg-primary/10 p-4 text-sm"
        >
          {notice}
        </p>
      )}
      {!editable && (
        <p className="rounded-xl border p-4 text-sm">
          Read-only access. Your role cannot edit this draft.
        </p>
      )}
      <fieldset
        disabled={!editable || pending}
        className="min-w-0 space-y-6 disabled:opacity-80"
      >
        <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">
              1. Customer & travel details
            </h2>
            <p className="text-sm text-muted-foreground">
              Private quotation details, separate from your public website
              packages.
            </p>
          </div>
          <div className={grid}>
            <Field
              label="Itinerary title"
              value={value.title}
              required
              onChange={(title) => patch({ title })}
            />
            <Field
              label="Customer name"
              value={value.customer_name}
              required
              onChange={(customer_name) => patch({ customer_name })}
            />
            <Field
              label="Customer email"
              type="email"
              value={value.customer_email}
              onChange={(customer_email) => patch({ customer_email })}
            />
            <Field
              label="Phone"
              type="tel"
              value={value.customer_phone}
              onChange={(customer_phone) => patch({ customer_phone })}
            />
            <Field
              label="Travel start date"
              type="date"
              value={value.travel_date}
              onChange={(travel_date) => patch({ travel_date })}
            />
            <Field
              label="Quotation valid until"
              type="date"
              value={value.valid_until}
              onChange={(valid_until) => patch({ valid_until })}
            />
            <NumberField
              label="Adults (12+)"
              min={1}
              value={value.adults}
              onChange={(adults) => patch({ adults })}
            />
            <NumberField
              label="Children (5–11)"
              value={value.children}
              onChange={(children) => patch({ children })}
            />
            <NumberField
              label="Infants (0–4)"
              value={value.infants}
              onChange={(infants) => patch({ infants })}
            />
            <NumberField
              label="Luggage pieces"
              value={value.luggage_count}
              onChange={(luggage_count) => patch({ luggage_count })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Changing guest counts does not overwrite individual hotel/activity
            allocations. Review every day after changing the group.
          </p>
        </section>
        {!initial.version && (
          <section className="space-y-4 rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">
                Import an existing package (optional)
              </h2>
              <p className="text-sm text-muted-foreground">
                Copy its days, hotels, activities, vehicle plan and terms as a
                starting point. The original website package will not change.
              </p>
            </div>
            {templates.length > 0 ? (
              <div className="grid items-end gap-4 sm:grid-cols-3">
                <Select
                  label="Package"
                  value={packageId}
                  options={templates.map((template) => ({
                    id: template.id,
                    name:
                      template.name +
                      (template.duration_days
                        ? ` · ${template.duration_days} days`
                        : ""),
                  }))}
                  onChange={setPackageId}
                />
                <Select
                  label="Hotel category"
                  value={categoryId}
                  options={refs.hotel_categories}
                  onChange={setCategoryId}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!packageId || !categoryId}
                  onClick={clone}
                >
                  {pending ? "Importing…" : "Import selected package"}
                </Button>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                No draft or published package is available to import. You can
                continue from scratch or create a package first.
              </p>
            )}
          </section>
        )}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">2. Day-wise itinerary</h2>
              <p className="text-sm text-muted-foreground">
                {value.days.length} days · hotel stays and activities stay with
                their day.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={value.days.length >= 60}
              onClick={addDay}
            >
              Add day
            </Button>
          </div>
          {value.days.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              Add your first day or copy an existing package to get started.
            </div>
          )}
          <nav
            aria-label="Jump to itinerary day"
            className="flex flex-wrap gap-2"
          >
            {value.days.map((d) => (
              <a
                key={d.id}
                className="rounded-lg border px-4 py-3 text-sm hover:bg-muted"
                href={"#day-" + d.id}
              >
                Day {d.day_number}
              </a>
            ))}
          </nav>
          {value.days.map((day) => (
            <DayEditor
              key={day.id}
              day={day}
              group={value}
              refs={refs}
              pricing={permissions.pricing}
              onChange={(d) =>
                patch({ days: value.days.map((x) => (x.id === d.id ? d : x)) })
              }
              onRemove={() => {
                if (
                  !window.confirm(
                    "Remove this day, its stays and activities? All vehicle allocations will also be cleared so that their billing dates can be reviewed.",
                  )
                )
                  return;
                patch({
                  days: value.days
                    .filter((x) => x.id !== day.id)
                    .map((d, i) => ({ ...d, day_number: i + 1 })),
                  transport: [],
                });
              }}
            />
          ))}
        </section>
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">3. Transport</h2>
            <p className="text-sm text-muted-foreground">
              Mix models, add luggage vehicles or change drivers during the
              tour. With no allocation, transport is not included.
            </p>
          </div>
          {value.transport.map((t) => (
            <TransportEditor
              key={t.id}
              value={t}
              refs={refs}
              days={value.days.length}
              travelDate={value.travel_date}
              pricing={permissions.pricing}
              onChange={(next) =>
                patch({
                  transport: value.transport.map((x) =>
                    x.id === next.id ? next : x,
                  ),
                })
              }
              onRemove={() =>
                patch({
                  transport: value.transport.filter((x) => x.id !== t.id),
                })
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={!value.days.length || value.transport.length >= 60}
            onClick={() =>
              patch({
                transport: [
                  ...value.transport,
                  {
                    id: crypto.randomUUID(),
                    base_location_id: "",
                    category_id: "",
                    model_id: null,
                    vendor_id: null,
                    fleet_id: null,
                    driver_id: null,
                    start_day: 1,
                    end_day: value.days.length,
                    quantity: 1,
                    luggage_only: false,
                    override_total_paise: null,
                    override_reason: "",
                  },
                ],
              })
            }
          >
            Add vehicle allocation
          </Button>
        </section>
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">
            4. Pricing & customer document
          </h2>
          <div className={grid}>
            {permissions.pricing && (
              <>
                <Field
                  label="Markup (%)"
                  type="number"
                  min={0}
                  max={1000}
                  step={0.01}
                  value={value.markup_bps / 100}
                  onChange={(v) =>
                    patch({ markup_bps: Math.round(Number(v) * 100) })
                  }
                />
                <Money
                  label="Group discount (INR)"
                  value={value.discount_paise}
                  onChange={(v) => patch({ discount_paise: v ?? 0 })}
                />
              </>
            )}
            <Money
              label="Advance requested (INR)"
              value={value.advance_paise}
              onChange={(v) => patch({ advance_paise: v ?? 0 })}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Check
              label="Show hotel component cost in PDF"
              value={value.show_hotel_cost}
              onChange={(v) => patch({ show_hotel_cost: v })}
            />
            <Check
              label="Show activity component cost in PDF"
              value={value.show_activity_cost}
              onChange={(v) => patch({ show_activity_cost: v })}
            />
            <Check
              label="Show vehicle component cost in PDF"
              value={value.show_vehicle_cost}
              onChange={(v) => patch({ show_vehicle_cost: v })}
            />
          </div>
          <TextArea
            label="Customer notes"
            value={value.public_notes}
            onChange={(v) => patch({ public_notes: v })}
          />
          <TextArea
            label="Inclusions, exclusions & terms"
            value={value.terms}
            onChange={(v) => patch({ terms: v })}
          />
          <TextArea
            label="Internal notes (never included in customer PDF)"
            value={value.internal_notes}
            onChange={(v) => patch({ internal_notes: v })}
          />
        </section>
      </fieldset>
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Live costing · entire group</h2>
        <p className="text-sm text-muted-foreground">
          Draft estimates use current catalog rates. Finalization locks a
          numbered quotation revision.
        </p>
        {pricing.error && (
          <p role="alert" className="text-destructive">
            {pricing.error}
          </p>
        )}
        {pricing.result && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">Day / service</th>
                    <th className="p-3">Details</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.result.lines.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-3">
                        Day {l.day} · {l.label}
                        {l.optional && (
                          <span className="block text-xs text-muted-foreground">
                            Optional — excluded
                          </span>
                        )}
                      </td>
                      <td className="min-w-48 p-3 text-muted-foreground">
                        {l.detail}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right tabular-nums">
                        {inr(l.amount_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <p>
                Catalog + overrides
                <br />
                <b>{inr(pricing.result.subtotal_paise)}</b>
              </p>
              <p>
                Markup / discount
                <br />
                <b>
                  {inr(pricing.result.markup_paise)} /{" "}
                  {inr(pricing.result.discount_paise)}
                </b>
              </p>
              <p className="text-lg">
                Group total
                <br />
                <b>{inr(pricing.result.total_paise)}</b>
              </p>
            </div>
            <fieldset
              disabled={!editable || pending || !permissions.pricing}
              className="space-y-3 rounded-xl border border-dashed p-4 disabled:opacity-80"
            >
              <legend className="px-2 text-sm font-semibold">
                Final group price override
              </legend>
              <p className="text-sm text-muted-foreground">
                Calculated total: {inr(pricing.result.calculated_total_paise)}.
                An override replaces the final group total, not individual
                service rates. Clear it to return to automatic pricing.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Money
                  label="Final group total (INR) — blank uses calculated total"
                  value={value.total_override_paise ?? null}
                  onChange={(v) =>
                    patch({
                      total_override_paise: v,
                      ...(v === null ? { total_override_reason: "" } : {}),
                    })
                  }
                />
                <Field
                  label="Final price override reason (internal only)"
                  required={value.total_override_paise != null}
                  value={value.total_override_reason ?? ""}
                  onChange={(v) => patch({ total_override_reason: v })}
                />
              </div>
              {value.total_override_paise != null && (
                <>
                  <p className="text-sm">
                    Manual total applied. It stays fixed when services or dates
                    change until you clear it.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      patch({
                        total_override_paise: null,
                        total_override_reason: "",
                      })
                    }
                  >
                    Use calculated total
                  </Button>
                </>
              )}
            </fieldset>
            {!permissions.pricing && (
              <p className="text-sm text-muted-foreground">
                Your role needs quotation pricing permission to override the
                total.
              </p>
            )}
            {pricing.result.warnings.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <h3 className="font-medium">Resolve before finalizing</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {pricing.result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Save first. Finalization and PDF actions appear on the saved
            quotation.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save draft"}
          </Button>
        </div>
      )}
      {detail && (
        <ItineraryActions
          value={{ ...detail, version: value.version }}
          permissions={permissions}
          blocked={dirty || pending}
        />
      )}
      <section className="space-y-4" aria-label="Customer preview">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <h2 className="font-semibold">Customer itinerary preview</h2>
            <p className="text-sm text-muted-foreground">
              Live draft preview, not a finalized quotation. Internal notes and
              override reasons are excluded.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!preview}
            aria-expanded={previewOpen}
            aria-controls="itinerary-customer-preview"
            onClick={() => {
              setPreviewOpen(!previewOpen);
              if (!previewOpen)
                requestAnimationFrame(() => {
                  const el = document.getElementById(
                    "itinerary-customer-preview",
                  );
                  el?.focus();
                  el?.scrollIntoView({ block: "start", behavior: "instant" });
                });
            }}
          >
            {previewOpen ? "Hide preview" : "Preview itinerary"}
          </Button>
        </div>
        {previewOpen && preview && (
          <div
            id="itinerary-customer-preview"
            tabIndex={-1}
            className="scroll-mt-24 space-y-3 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(pricing.result?.warnings.length ?? 0) > 0 && (
              <p
                role="status"
                className="rounded-lg border border-destructive/40 p-3 text-sm"
              >
                Incomplete draft: resolve the costing warnings above before
                issuing this quotation.
              </p>
            )}
            <QuotePreview document={preview} />
          </div>
        )}
      </section>
    </form>
  );
}
