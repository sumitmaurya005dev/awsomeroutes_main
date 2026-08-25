"use client";

import * as React from "react";
import { Calculator } from "lucide-react";
import { calculateActivityPrice, formatPaise } from "@/lib/activities/pricing";
import type { ActivityOffering } from "@/types/activity";

export function ActivityPricePreview({
  offering,
}: {
  offering: ActivityOffering;
}) {
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [participants, setParticipants] = React.useState(2);
  const [variantId, setVariantId] = React.useState("");
  const [optionalChargeIds, setOptionalChargeIds] = React.useState<string[]>(
    [],
  );
  const selectedVariant =
    offering.variants.find((variant) => variant.id === variantId) ?? null;
  const isPerPerson = offering.pricing_model === "per_person";
  const needsAgeBreakdown =
    isPerPerson ||
    offering.charges.some(
      (charge) =>
        charge.status === "active" &&
        (charge.calculation_type === "per_adult" ||
          charge.calculation_type === "per_child"),
    );
  const optionalCharges = offering.charges.filter(
    (charge) =>
      charge.status === "active" &&
      !charge.mandatory &&
      (charge.activity_variant_id === null ||
        charge.activity_variant_id === variantId),
  );
  const calculation = React.useMemo(() => {
    try {
      return {
        value: calculateActivityPrice({
          pricingModel: offering.pricing_model,
          basePricePaise: offering.base_price_paise,
          capacityPerUnit:
            selectedVariant?.capacity_override ??
            offering.maximum_participants_per_unit,
          maximumUnitsPerBooking: offering.maximum_units_per_booking,
          maximumParticipantsPerBooking:
            offering.maximum_participants_per_booking,
          minimumParticipants: offering.minimum_participants,
          minimumBillableParticipants: offering.minimum_billable_participants,
          taxIncluded: offering.tax_included,
          taxRateBps: offering.tax_rate_bps,
          participants: needsAgeBreakdown
            ? { adult: adults, child: children }
            : { participant: participants },
          participantPrices: offering.participant_prices,
          charges: offering.charges,
          variantId: variantId || null,
          priceOverridePaise: selectedVariant?.price_override_paise,
          selectedOptionalChargeIds: optionalChargeIds,
        }),
        error: null,
      };
    } catch (error) {
      return {
        value: null,
        error:
          error instanceof Error ? error.message : "Unable to calculate price.",
      };
    }
  }, [
    adults,
    children,
    participants,
    needsAgeBreakdown,
    offering,
    optionalChargeIds,
    selectedVariant,
    variantId,
  ]);

  function toggleOptionalCharge(id: string, checked: boolean) {
    setOptionalChargeIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((chargeId) => chargeId !== id),
    );
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Pricing preview</h4>
      </div>
      <div className="grid gap-2 sm:max-w-xl sm:grid-cols-3">
        {needsAgeBreakdown ? (
          <>
            <label className="text-xs text-muted-foreground">
              Adults
              <input
                type="number"
                min="0"
                value={adults}
                onChange={(event) =>
                  setAdults(Math.max(0, Number(event.target.value) || 0))
                }
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Children
              <input
                type="number"
                min="0"
                value={children}
                onChange={(event) =>
                  setChildren(Math.max(0, Number(event.target.value) || 0))
                }
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              />
            </label>
          </>
        ) : (
          <label className="text-xs text-muted-foreground">
            Total participants
            <input
              type="number"
              min="1"
              value={participants}
              onChange={(event) =>
                setParticipants(Math.max(0, Number(event.target.value) || 0))
              }
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
            />
          </label>
        )}
        <label className="text-xs text-muted-foreground">
          Variant / zone
          <select
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setOptionalChargeIds([]);
            }}
            className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">Base offering</option>
            {offering.variants
              .filter((variant) => variant.status === "active")
              .map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {optionalCharges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {optionalCharges.map((charge) => (
            <label
              key={charge.id}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <input
                type="checkbox"
                checked={optionalChargeIds.includes(charge.id)}
                onChange={(event) =>
                  toggleOptionalCharge(charge.id, event.target.checked)
                }
              />
              {charge.name} ({formatPaise(charge.amount_paise)})
            </label>
          ))}
        </div>
      )}
      {calculation.error ? (
        <p className="mt-3 text-xs text-destructive">{calculation.error}</p>
      ) : (
        calculation.value && (
          <div className="mt-3 grid gap-1 text-xs sm:grid-cols-4">
            {offering.pricing_model === "per_unit" && (
              <span>
                Units: <strong>{calculation.value.units}</strong>
              </span>
            )}
            <span>
              Base:{" "}
              <strong>{formatPaise(calculation.value.baseAmountPaise)}</strong>
            </span>
            <span>
              Charges:{" "}
              <strong>
                {formatPaise(calculation.value.additionalChargesPaise)}
              </strong>
            </span>
            <span>
              Total:{" "}
              <strong>{formatPaise(calculation.value.totalPaise)}</strong>
            </span>
          </div>
        )
      )}
    </div>
  );
}
