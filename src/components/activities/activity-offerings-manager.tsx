"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  IndianRupee,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteActivityChild,
  deleteOffering,
} from "@/lib/activities/mutations";
import { formatPaise } from "@/lib/activities/pricing";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type { ActivityOffering } from "@/types/activity";
import { ActivityOfferingFormDialog } from "./activity-offering-form-dialog";
import { ActivityPricePreview } from "./activity-price-preview";
import {
  ActivityRuleDialog,
  type RuleMode,
  type RuleRecord,
} from "./activity-rule-dialog";

export function ActivityOfferingsManager({
  activityId,
  offerings,
  canAddOffering,
  canManagePricing,
  canOverridePrice,
  canDelete,
}: {
  activityId: string;
  offerings: ActivityOffering[];
  canAddOffering: boolean;
  canManagePricing: boolean;
  canOverridePrice: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [offeringEditor, setOfferingEditor] = React.useState<
    ActivityOffering | "new" | null
  >(null);
  const [ruleEditor, setRuleEditor] = React.useState<{
    offering: ActivityOffering;
    mode: RuleMode;
    record: RuleRecord | null;
  } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function removeOffering(offering: ActivityOffering) {
    if (
      !window.confirm(
        `Delete the ${offering.location?.name ?? "selected"} offering and all of its pricing rules?`,
      )
    )
      return;
    setBusyId(offering.id);
    setError(null);
    try {
      const result = await deleteOffering(offering.id, activityId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  async function removeRule(
    table:
      | "activity_variants"
      | "activity_participant_prices"
      | "activity_charges"
      | "activity_slots",
    id: string,
  ) {
    if (!window.confirm("Delete this pricing rule?")) return;
    setBusyId(id);
    setError(null);
    try {
      const result = await deleteActivityChild(table, id, activityId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Locations and pricing</h2>
          <p className="text-sm text-muted-foreground">
            Each location has independent pricing, capacity, variants, charges
            and operating slots.
          </p>
        </div>
        {canAddOffering && (
          <Button type="button" onClick={() => setOfferingEditor("new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location Offering
          </Button>
        )}
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!offerings.length ? (
        <div className="grid min-h-40 place-items-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
          <div>
            <MapPin className="mx-auto mb-2 h-6 w-6" />
            <p>No location offerings configured.</p>
            <p>Add a location before defining variants and charges.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {offerings.map((offering) => (
            <article
              key={offering.id}
              className="space-y-5 rounded-xl border p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {offering.location?.name ?? "Unknown location"}
                    </h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {offering.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      offering.location?.destination?.region?.country?.name,
                      offering.location?.destination?.region?.name,
                      offering.location?.destination?.name,
                    ]
                      .filter(Boolean)
                      .join(" › ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {formatPaise(offering.base_price_paise)} /{" "}
                      {offering.pricing_model.replace("per_", "")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Min {offering.minimum_participants}
                      {offering.maximum_participants_per_unit
                        ? ` · ${offering.maximum_participants_per_unit}/unit`
                        : ""}
                    </span>
                    {offering.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {offering.duration_minutes} min
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {canManagePricing && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setOfferingEditor(offering)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  {(canManagePricing || canDelete) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === offering.id}
                      onClick={() => removeOffering(offering)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              <ActivityPricePreview offering={offering} />
              <div className="grid gap-4 xl:grid-cols-2">
                <RuleSection
                  title="Variants / zones"
                  empty="No variants; base offering applies."
                  canAdd={canManagePricing}
                  onAdd={() =>
                    setRuleEditor({ offering, mode: "variant", record: null })
                  }
                >
                  {offering.variants.map((item) => (
                    <RuleRow
                      key={item.id}
                      title={item.name}
                      detail={[
                        item.price_override_paise !== null
                          ? formatPaise(item.price_override_paise)
                          : "Base price",
                        item.capacity_override
                          ? `Capacity ${item.capacity_override}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      canEdit={canManagePricing}
                      busy={busyId === item.id}
                      onEdit={() =>
                        setRuleEditor({
                          offering,
                          mode: "variant",
                          record: item,
                        })
                      }
                      onDelete={() => removeRule("activity_variants", item.id)}
                    />
                  ))}
                </RuleSection>
                {offering.pricing_model === "per_person" && (
                  <RuleSection
                    title="Participant prices"
                    empty="The default per-person rate applies to every participant. Add a rule only when adult, child, or another participant type has a different price."
                    canAdd={canManagePricing}
                    onAdd={() =>
                      setRuleEditor({
                        offering,
                        mode: "participant",
                        record: null,
                      })
                    }
                  >
                    {offering.participant_prices.map((item) => (
                      <RuleRow
                        key={item.id}
                        title={item.participant_type}
                        detail={`${formatPaise(item.price_paise)}${item.minimum_age !== null || item.maximum_age !== null ? ` · Age ${item.minimum_age ?? 0}–${item.maximum_age ?? "+"}` : ""}`}
                        canEdit={canManagePricing}
                        busy={busyId === item.id}
                        onEdit={() =>
                          setRuleEditor({
                            offering,
                            mode: "participant",
                            record: item,
                          })
                        }
                        onDelete={() =>
                          removeRule("activity_participant_prices", item.id)
                        }
                      />
                    ))}
                  </RuleSection>
                )}
                <RuleSection
                  title="Additional charges"
                  empty="No additional charges."
                  canAdd={canManagePricing}
                  onAdd={() =>
                    setRuleEditor({ offering, mode: "charge", record: null })
                  }
                >
                  {offering.charges.map((item) => (
                    <RuleRow
                      key={item.id}
                      title={item.name}
                      detail={`${formatPaise(item.amount_paise)} · ${item.calculation_type.replaceAll("_", " ")}${item.mandatory ? " · Mandatory" : " · Optional"}`}
                      canEdit={canManagePricing}
                      busy={busyId === item.id}
                      onEdit={() =>
                        setRuleEditor({
                          offering,
                          mode: "charge",
                          record: item,
                        })
                      }
                      onDelete={() => removeRule("activity_charges", item.id)}
                    />
                  ))}
                </RuleSection>
                <RuleSection
                  title="Time slots"
                  empty="No fixed time slots."
                  canAdd={canManagePricing}
                  onAdd={() =>
                    setRuleEditor({ offering, mode: "slot", record: null })
                  }
                >
                  {offering.slots.map((item) => (
                    <RuleRow
                      key={item.id}
                      title={item.name}
                      detail={`${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}${item.price_override_paise !== null ? ` · ${formatPaise(item.price_override_paise)}` : ""}`}
                      canEdit={canManagePricing}
                      busy={busyId === item.id}
                      onEdit={() =>
                        setRuleEditor({ offering, mode: "slot", record: item })
                      }
                      onDelete={() => removeRule("activity_slots", item.id)}
                    />
                  ))}
                </RuleSection>
              </div>
            </article>
          ))}
        </div>
      )}
      {offeringEditor !== null && (
        <ActivityOfferingFormDialog
          activityId={activityId}
          initial={offeringEditor === "new" ? null : offeringEditor}
          open
          onOpenChange={(open) => !open && setOfferingEditor(null)}
        />
      )}
      {ruleEditor && (
        <ActivityRuleDialog
          activityId={activityId}
          offering={ruleEditor.offering}
          mode={ruleEditor.mode}
          initial={ruleEditor.record}
          canOverridePrice={canOverridePrice}
          open
          onOpenChange={(open) => !open && setRuleEditor(null)}
        />
      )}
    </section>
  );
}

function RuleSection({
  title,
  empty,
  canAdd,
  onAdd,
  children,
}: {
  title: string;
  empty: string;
  canAdd: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>
      <div className="divide-y">
        {hasChildren ? (
          children
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  title,
  detail,
  canEdit,
  busy,
  onEdit,
  onDelete,
}: {
  title: string;
  detail: string;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium capitalize">
          {title.replaceAll("_", " ")}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {canEdit && (
        <div className="flex">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="p-1.5 text-destructive disabled:opacity-50"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
