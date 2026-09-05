"use client";
import { useId } from "react";
import { VehicleSearchableSelect } from "@/components/vehicles/vehicle-searchable-select";
export const control =
  "min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm font-medium">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className={control}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field
      label={label}
      value={value}
      type="number"
      min={min}
      max={max}
      step={1}
      onChange={(v) => onChange(v === "" ? 0 : Number(v))}
    />
  );
}
export function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <Field
      label={label}
      type="number"
      min={0}
      step={0.01}
      max={10000000}
      value={value === null ? "" : value / 100}
      onChange={(v) => onChange(v === "" ? null : Math.round(Number(v) * 100))}
    />
  );
}
export function Stepper({
  label,
  value,
  min = 1,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const change = (n: number) => {
    if (Number.isFinite(n))
      onChange(Math.max(min, Math.min(max, Math.trunc(n))));
  };
  const button =
    "min-h-11 min-w-11 rounded-lg border bg-background text-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className={button}
          aria-label={"Decrease " + label.toLowerCase()}
          disabled={value <= min}
          onClick={() => change(value - 1)}
        >
          −
        </button>
        <input
          id={id}
          className={control + " min-w-0 text-center"}
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => change(Number(e.target.value))}
        />
        <button
          type="button"
          className={button}
          aria-label={"Increase " + label.toLowerCase()}
          disabled={value >= max}
          onClick={() => change(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <textarea
        rows={4}
        className={control}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <input
        className="h-4 w-4 accent-primary"
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  nullable = false,
}: {
  label: string;
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
  nullable?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0 [&_button]:min-h-11 [&_.min-w-\[260px\]]:min-w-0">
      <VehicleSearchableSelect
        label={label}
        name={id}
        value={value ?? ""}
        options={options.map((x) => ({ value: x.id, label: x.name }))}
        onValueChange={onChange}
        placeholder={"Select " + label.toLowerCase()}
        emptyOptionLabel={nullable ? "None / automatic" : undefined}
      />
    </div>
  );
}
export function Override({
  value,
  reason,
  onChange,
  allowed,
}: {
  value: number | null;
  reason: string;
  onChange: (p: {
    override_total_paise?: number | null;
    override_reason?: string;
  }) => void;
  allowed: boolean;
}) {
  if (!allowed)
    return value !== null ? (
      <p className="text-sm text-muted-foreground">
        Approved price override applied. Pricing permission is required to
        change it.
      </p>
    ) : null;
  return (
    <details className="rounded-lg border border-dashed p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Price override {value !== null ? "(applied)" : "(optional)"}
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Money
          label="Total for this row (INR) — blank uses catalog"
          value={value}
          onChange={(v) => onChange({ override_total_paise: v })}
        />
        <Field
          label="Override reason"
          value={reason}
          required={value !== null}
          onChange={(v) => onChange({ override_reason: v })}
        />
      </div>
    </details>
  );
}
export const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value / 100);
export const grid = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
