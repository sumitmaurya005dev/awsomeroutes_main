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
import { ActivityLocationCombobox } from "./activity-location-combobox";
import { saveOffering } from "@/lib/activities/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type {
  ActivityLocationOption,
  ActivityOffering,
  OfferingStatus,
  PricingModel,
} from "@/types/activity";

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
const toRupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? "" : String(paise / 100);
const toPaise = (rupees: string) => Math.round((Number(rupees) || 0) * 100);
const optionalNumber = (value: string) => (value.trim() ? Number(value) : null);
const pricingModelHelp: Record<PricingModel, string> = {
  per_unit:
    "One fixed price per jeep, boat, raft, or other unit. Units are calculated from group size and unit capacity.",
  per_person:
    "Each participant is charged. Adult, child, infant, senior, or general rates can be configured after saving.",
  per_group:
    "One fixed price for the complete group, within the participant limit.",
  per_session:
    "One fixed price for a scheduled session, within the participant limit.",
};
const basePriceLabels: Record<PricingModel, string> = {
  per_unit: "Price per unit (₹)",
  per_person: "Default price per person (₹)",
  per_group: "Price per group (₹)",
  per_session: "Price per session (₹)",
};

export function ActivityOfferingFormDialog({
  activityId,
  initial,
  open,
  onOpenChange,
}: {
  activityId: string;
  initial: ActivityOffering | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(() => valuesFrom(initial));
  const initialLocationOption = locationOptionFromOffering(initial);
  const pricingModel = form.pricing_model as PricingModel;
  const isPerUnit = pricingModel === "per_unit";
  const isPerPerson = pricingModel === "per_person";

  function changePricingModel(nextModel: PricingModel) {
    setForm((current) => ({
      ...current,
      pricing_model: nextModel,
      maximum_participants_per_unit:
        nextModel === "per_unit" ? current.maximum_participants_per_unit : "",
      maximum_units_per_booking:
        nextModel === "per_unit" ? current.maximum_units_per_booking : "",
      minimum_billable_participants:
        nextModel === "per_person"
          ? current.minimum_billable_participants
          : current.minimum_participants,
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.location_id) {
      setError("Select an activity location.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveOffering(initial?.id ?? null, {
        activity_id: activityId,
        location_id: form.location_id,
        pricing_model: form.pricing_model as
          "per_unit" | "per_person" | "per_group" | "per_session",
        base_price_paise: toPaise(form.base_price),
        currency: "INR",
        minimum_participants: Number(form.minimum_participants),
        maximum_participants_per_unit: isPerUnit
          ? optionalNumber(form.maximum_participants_per_unit)
          : null,
        maximum_units_per_booking: isPerUnit
          ? optionalNumber(form.maximum_units_per_booking)
          : null,
        maximum_participants_per_booking: optionalNumber(
          form.maximum_participants_per_booking,
        ),
        minimum_billable_participants: isPerPerson
          ? Number(form.minimum_billable_participants)
          : Number(form.minimum_participants),
        duration_minutes: optionalNumber(form.duration_minutes),
        tax_included: form.tax_included,
        tax_rate_bps: Math.round((Number(form.tax_percent) || 0) * 100),
        meeting_point: form.meeting_point.trim() || null,
        latitude: optionalNumber(form.latitude),
        longitude: optionalNumber(form.longitude),
        reporting_instructions: form.reporting_instructions.trim() || null,
        advance_booking_hours: Number(form.advance_booking_hours),
        status: form.status as
          "active" | "temporarily_unavailable" | "inactive",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch (submitError) {
      setError(getNetworkErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit location offering" : "Add location offering"}
          </DialogTitle>
          <DialogDescription>
            Configure where this activity runs, its base pricing, capacity and
            operational details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Location
              <ActivityLocationCombobox
                value={form.location_id}
                initialOption={initialLocationOption}
                disabled={saving}
                onChange={(location) =>
                  setForm((current) => ({
                    ...current,
                    location_id: location.id,
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Pricing model
              <select
                className={selectClass}
                value={form.pricing_model}
                onChange={(event) =>
                  changePricingModel(event.target.value as PricingModel)
                }
              >
                <option value="per_unit">Per unit (jeep/boat/raft)</option>
                <option value="per_person">Per person</option>
                <option value="per_group">Per group</option>
                <option value="per_session">Per session</option>
              </select>
            </label>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground sm:col-span-2">
              {pricingModelHelp[pricingModel]}
            </div>
            <label className="space-y-2 text-sm font-medium">
              {basePriceLabels[pricingModel]}
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.base_price}
                onChange={(event) =>
                  setForm({ ...form, base_price: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Minimum participants
              <Input
                required
                type="number"
                min="1"
                value={form.minimum_participants}
                onChange={(event) => {
                  const minimumParticipants = event.target.value;
                  setForm({
                    ...form,
                    minimum_participants: minimumParticipants,
                    minimum_billable_participants: isPerPerson
                      ? form.minimum_billable_participants
                      : minimumParticipants,
                  });
                }}
              />
            </label>
            {isPerUnit && (
              <>
                <label className="space-y-2 text-sm font-medium">
                  Participants per unit
                  <Input
                    required
                    type="number"
                    min="1"
                    value={form.maximum_participants_per_unit}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        maximum_participants_per_unit: event.target.value,
                      })
                    }
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    Example: enter 6 when one jeep can carry 6 guests.
                  </span>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Maximum units per booking
                  <Input
                    type="number"
                    min="1"
                    value={form.maximum_units_per_booking}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        maximum_units_per_booking: event.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}
            <label className="space-y-2 text-sm font-medium">
              Maximum participants per booking
              <Input
                type="number"
                min="1"
                value={form.maximum_participants_per_booking}
                onChange={(event) =>
                  setForm({
                    ...form,
                    maximum_participants_per_booking: event.target.value,
                  })
                }
              />
            </label>
            {isPerPerson && (
              <label className="space-y-2 text-sm font-medium">
                Minimum billable participants
                <Input
                  required
                  type="number"
                  min={form.minimum_participants || "1"}
                  value={form.minimum_billable_participants}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      minimum_billable_participants: event.target.value,
                    })
                  }
                />
                <span className="block text-xs font-normal text-muted-foreground">
                  Minimum number of people charged even when fewer attend.
                </span>
              </label>
            )}
            <label className="space-y-2 text-sm font-medium">
              Duration (minutes)
              <Input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(event) =>
                  setForm({ ...form, duration_minutes: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Advance booking (hours)
              <Input
                required
                type="number"
                min="0"
                value={form.advance_booking_hours}
                onChange={(event) =>
                  setForm({
                    ...form,
                    advance_booking_hours: event.target.value,
                  })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Tax rate (%)
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.tax_percent}
                onChange={(event) =>
                  setForm({ ...form, tax_percent: event.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-2 pt-8 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.tax_included}
                onChange={(event) =>
                  setForm({ ...form, tax_included: event.target.checked })
                }
              />
              Tax included in displayed rates
            </label>
            <label className="space-y-2 text-sm font-medium">
              Latitude
              <Input
                type="number"
                min="-90"
                max="90"
                step="0.000001"
                value={form.latitude}
                onChange={(event) =>
                  setForm({ ...form, latitude: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Longitude
              <Input
                type="number"
                min="-180"
                max="180"
                step="0.000001"
                value={form.longitude}
                onChange={(event) =>
                  setForm({ ...form, longitude: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Meeting point
              <Input
                value={form.meeting_point}
                onChange={(event) =>
                  setForm({ ...form, meeting_point: event.target.value })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Reporting instructions
              <Textarea
                value={form.reporting_instructions}
                onChange={(event) =>
                  setForm({
                    ...form,
                    reporting_instructions: event.target.value,
                  })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Status
              <select
                className={selectClass}
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as OfferingStatus,
                  })
                }
              >
                <option value="active">Active</option>
                <option value="temporarily_unavailable">
                  Temporarily unavailable
                </option>
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
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Save Offering" : "Add Offering"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function locationOptionFromOffering(
  initial: ActivityOffering | null,
): ActivityLocationOption | null {
  const location = initial?.location;
  if (!location) return null;

  return {
    id: location.id,
    name: location.name,
    destinationName: location.destination?.name ?? "",
    regionName: location.destination?.region?.name ?? "",
    countryName: location.destination?.region?.country?.name ?? "",
  };
}

function valuesFrom(initial: ActivityOffering | null) {
  return {
    location_id: initial?.location_id ?? "",
    pricing_model: initial?.pricing_model ?? "per_unit",
    base_price: toRupees(initial?.base_price_paise),
    minimum_participants: String(initial?.minimum_participants ?? 1),
    maximum_participants_per_unit:
      initial?.maximum_participants_per_unit?.toString() ?? "",
    maximum_units_per_booking:
      initial?.maximum_units_per_booking?.toString() ?? "",
    maximum_participants_per_booking:
      initial?.maximum_participants_per_booking?.toString() ?? "",
    minimum_billable_participants: String(
      initial?.minimum_billable_participants ?? 1,
    ),
    duration_minutes: initial?.duration_minutes?.toString() ?? "",
    tax_included: initial?.tax_included ?? true,
    tax_percent: initial ? String(initial.tax_rate_bps / 100) : "0",
    meeting_point: initial?.meeting_point ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    reporting_instructions: initial?.reporting_instructions ?? "",
    advance_booking_hours: String(initial?.advance_booking_hours ?? 0),
    status: initial?.status ?? "active",
  };
}
