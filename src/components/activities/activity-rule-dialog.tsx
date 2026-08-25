"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  saveCharge,
  saveParticipantPrice,
  saveSlot,
  saveVariant,
} from "@/lib/activities/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type {
  ActivityCharge,
  ActivityOffering,
  ActivityParticipantPrice,
  ActivitySlot,
  ActivityVariant,
} from "@/types/activity";

export type RuleMode = "variant" | "participant" | "charge" | "slot";
export type RuleRecord =
  ActivityVariant | ActivityParticipantPrice | ActivityCharge | ActivitySlot;
type RuleForm = {
  name: string;
  description: string;
  price: string;
  capacity: string;
  duration: string;
  display_order: string;
  status: string;
  variant_id: string;
  participant_type: string;
  minimum_age: string;
  maximum_age: string;
  capacity_count: string;
  calculation_type: string;
  mandatory: boolean;
  taxable: boolean;
  start_time: string;
  end_time: string;
  reporting_minutes_before: string;
};
const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
const paise = (value: string) => Math.round((Number(value) || 0) * 100);
const optionalPaise = (value: string) => (value.trim() ? paise(value) : null);
const optionalNumber = (value: string) => (value.trim() ? Number(value) : null);

export function ActivityRuleDialog({
  activityId,
  offering,
  mode,
  initial,
  canOverridePrice,
  open,
  onOpenChange,
}: {
  activityId: string;
  offering: ActivityOffering;
  mode: RuleMode;
  initial: RuleRecord | null;
  canOverridePrice: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<RuleForm>(() =>
    valuesFrom(mode, initial),
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === "participant" && offering.pricing_model !== "per_person") {
        setError(
          "Participant prices are available only for per-person pricing.",
        );
        return;
      }
      let result:
        | { success: true; data: { id: string } }
        | { success: false; error: string };
      if (mode === "variant")
        result = await saveVariant(initial?.id ?? null, {
          activity_offering_id: offering.id,
          name: form.name,
          description: form.description.trim() || null,
          price_override_paise: optionalPaise(form.price),
          capacity_override:
            offering.pricing_model === "per_unit"
              ? optionalNumber(form.capacity)
              : null,
          duration_override_minutes: optionalNumber(form.duration),
          display_order: Number(form.display_order),
          status: form.status as "active" | "inactive",
        });
      else if (mode === "participant")
        result = await saveParticipantPrice(initial?.id ?? null, {
          activity_offering_id: offering.id,
          activity_variant_id: form.variant_id || null,
          participant_type: form.participant_type as
            "infant" | "child" | "adult" | "senior" | "participant",
          minimum_age: optionalNumber(form.minimum_age),
          maximum_age: optionalNumber(form.maximum_age),
          price_paise: paise(form.price),
          capacity_count: Number(form.capacity_count),
          status: form.status as "active" | "inactive",
        });
      else if (mode === "charge")
        result = await saveCharge(initial?.id ?? null, {
          activity_offering_id: offering.id,
          activity_variant_id: form.variant_id || null,
          name: form.name,
          calculation_type: form.calculation_type as
            | "per_person"
            | "per_adult"
            | "per_child"
            | "per_unit"
            | "per_booking"
            | "fixed",
          amount_paise: paise(form.price),
          mandatory: form.mandatory,
          taxable: form.taxable,
          description: form.description.trim() || null,
          display_order: Number(form.display_order),
          status: form.status as "active" | "inactive",
        });
      else
        result = await saveSlot(initial?.id ?? null, {
          activity_offering_id: offering.id,
          activity_variant_id: form.variant_id || null,
          name: form.name,
          start_time: form.start_time,
          end_time: form.end_time,
          price_override_paise: optionalPaise(form.price),
          capacity_override: optionalNumber(form.capacity),
          reporting_minutes_before: Number(form.reporting_minutes_before),
          status: form.status as "active" | "inactive",
        });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
      router.replace(`/home/activities/${activityId}/edit`);
    } catch (submitError) {
      setError(getNetworkErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  const titles: Record<RuleMode, string> = {
    variant: "Variant or zone",
    participant: "Participant price",
    charge: "Additional charge",
    slot: "Time slot",
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit" : "Add"} {titles[mode].toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Changes apply only to{" "}
            {offering.location?.name ?? "this location offering"}. Pricing
            model: {offering.pricing_model.replace("per_", "per ")}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(mode === "variant" || mode === "charge" || mode === "slot") && (
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Name
                <Input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
            )}
            {mode !== "variant" && (
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Variant (optional)
                <select
                  className={selectClass}
                  value={form.variant_id}
                  onChange={(event) =>
                    setForm({ ...form, variant_id: event.target.value })
                  }
                >
                  <option value="">Applies to all variants</option>
                  {offering.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === "participant" && (
              <>
                <label className="space-y-2 text-sm font-medium">
                  Participant type
                  <select
                    className={selectClass}
                    value={form.participant_type}
                    onChange={(event) =>
                      setForm({ ...form, participant_type: event.target.value })
                    }
                  >
                    <option value="adult">Adult</option>
                    <option value="child">Child</option>
                    <option value="infant">Infant</option>
                    <option value="senior">Senior</option>
                    <option value="participant">General participant</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Price (₹)
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Minimum age
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={form.minimum_age}
                    onChange={(event) =>
                      setForm({ ...form, minimum_age: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Maximum age
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={form.maximum_age}
                    onChange={(event) =>
                      setForm({ ...form, maximum_age: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Capacity count
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.capacity_count}
                    onChange={(event) =>
                      setForm({ ...form, capacity_count: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {mode === "variant" && (
              <>
                <label className="space-y-2 text-sm font-medium">
                  Price override (₹)
                  <Input
                    disabled={!canOverridePrice}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                  />
                  {!canOverridePrice && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Requires activities.override_price permission.
                    </span>
                  )}
                </label>
                {offering.pricing_model === "per_unit" && (
                  <label className="space-y-2 text-sm font-medium">
                    Participants per unit override
                    <Input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(event) =>
                        setForm({ ...form, capacity: event.target.value })
                      }
                    />
                  </label>
                )}
                <label className="space-y-2 text-sm font-medium">
                  Duration override (minutes)
                  <Input
                    type="number"
                    min="1"
                    value={form.duration}
                    onChange={(event) =>
                      setForm({ ...form, duration: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Display order
                  <Input
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(event) =>
                      setForm({ ...form, display_order: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium sm:col-span-2">
                  Description
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {mode === "charge" && (
              <>
                <label className="space-y-2 text-sm font-medium">
                  Calculation
                  <select
                    className={selectClass}
                    value={form.calculation_type}
                    onChange={(event) =>
                      setForm({ ...form, calculation_type: event.target.value })
                    }
                  >
                    <option value="per_person">Per person</option>
                    <option value="per_adult">Per adult</option>
                    <option value="per_child">Per child</option>
                    {offering.pricing_model === "per_unit" && (
                      <option value="per_unit">Per unit</option>
                    )}
                    <option value="per_booking">Per booking</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Amount (₹)
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.mandatory}
                    onChange={(event) =>
                      setForm({ ...form, mandatory: event.target.checked })
                    }
                  />
                  Mandatory charge
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.taxable}
                    onChange={(event) =>
                      setForm({ ...form, taxable: event.target.checked })
                    }
                  />
                  Taxable charge
                </label>
                <label className="space-y-2 text-sm font-medium sm:col-span-2">
                  Description
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {mode === "slot" && (
              <>
                <label className="space-y-2 text-sm font-medium">
                  Start time
                  <Input
                    required
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      setForm({ ...form, start_time: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  End time
                  <Input
                    required
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      setForm({ ...form, end_time: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Price override (₹)
                  <Input
                    disabled={!canOverridePrice}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                  />
                  {!canOverridePrice && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Requires activities.override_price permission.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Capacity override
                  <Input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) =>
                      setForm({ ...form, capacity: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Report before (minutes)
                  <Input
                    required
                    type="number"
                    min="0"
                    value={form.reporting_minutes_before}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        reporting_minutes_before: event.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}
            <label className="space-y-2 text-sm font-medium">
              Status
              <select
                className={selectClass}
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function valuesFrom(mode: RuleMode, initial: RuleRecord | null) {
  const variant =
    mode === "variant" ? (initial as ActivityVariant | null) : null;
  const participant =
    mode === "participant"
      ? (initial as ActivityParticipantPrice | null)
      : null;
  const charge = mode === "charge" ? (initial as ActivityCharge | null) : null;
  const slot = mode === "slot" ? (initial as ActivitySlot | null) : null;
  const price =
    mode === "variant"
      ? variant?.price_override_paise === null ||
        variant?.price_override_paise === undefined
        ? ""
        : String(variant.price_override_paise / 100)
      : mode === "participant"
        ? String((participant?.price_paise ?? 0) / 100)
        : mode === "charge"
          ? String((charge?.amount_paise ?? 0) / 100)
          : slot?.price_override_paise === null ||
              slot?.price_override_paise === undefined
            ? ""
            : String(slot.price_override_paise / 100);
  return {
    name: variant?.name ?? charge?.name ?? slot?.name ?? "",
    description: variant?.description ?? charge?.description ?? "",
    price,
    capacity: String(
      variant?.capacity_override ?? slot?.capacity_override ?? "",
    ),
    duration: String(variant?.duration_override_minutes ?? ""),
    display_order: String(variant?.display_order ?? charge?.display_order ?? 0),
    status:
      variant?.status ??
      participant?.status ??
      charge?.status ??
      slot?.status ??
      "active",
    variant_id:
      participant?.activity_variant_id ??
      charge?.activity_variant_id ??
      slot?.activity_variant_id ??
      "",
    participant_type: participant?.participant_type ?? "adult",
    minimum_age: String(participant?.minimum_age ?? ""),
    maximum_age: String(participant?.maximum_age ?? ""),
    capacity_count: String(participant?.capacity_count ?? 1),
    calculation_type: charge?.calculation_type ?? "per_person",
    mandatory: charge?.mandatory ?? true,
    taxable: charge?.taxable ?? false,
    start_time: slot?.start_time?.slice(0, 5) ?? "06:00",
    end_time: slot?.end_time?.slice(0, 5) ?? "09:00",
    reporting_minutes_before: String(slot?.reporting_minutes_before ?? 0),
  };
}
