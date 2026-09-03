"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
import { DataPagination } from "@/components/common/data-pagination";
import { VehicleSearchableSelect } from "@/components/vehicles/vehicle-searchable-select";
import {
  deleteHotelLocationRate,
  saveHotelLocationRate,
} from "@/lib/hotels/mutations";
import type {
  ChildPricingPolicy,
  HotelCategory,
  HotelLocationRate,
  HotelPricingLocation,
  MealPlan,
} from "@/types/hotel";

const selectClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm";
const toPaise = (value: string) => Math.round(Number(value) * 100);
const toRupees = (value: number) => String(value / 100);
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);

export function HotelLocationPricing({
  data,
  count,
  page,
  limit,
  totalPages,
  locations,
  categories,
}: {
  data: HotelLocationRate[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  locations: HotelPricingLocation[];
  categories: HotelCategory[];
}) {
  const router = useRouter();
  const [editor, setEditor] = React.useState<HotelLocationRate | "new" | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function remove(rate: HotelLocationRate) {
    const locationName = rate.location?.name ?? "this location";
    if (!confirm(`Delete the ${rate.category.name} · ${rate.meal_plan} default for ${locationName}? Hotels using it will no longer have this inherited rate.`)) return;
    setBusyId(rate.id);
    setError(null);
    try {
      const result = await deleteHotelLocationRate(rate.id);
      if (!result.success) setError(result.error);
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The location rate could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditor("new")}>
          <Plus className="mr-2 h-4 w-4" />Add location rate
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-5 py-4 text-left">Location</th>
                <th className="px-5 py-4 text-left">Category / meal</th>
                <th className="px-5 py-4 text-left">Room rate</th>
                <th className="px-5 py-4 text-left">Extra adult</th>
                <th className="px-5 py-4 text-left">Child with / without bed</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length ? data.map((rate) => (
                <tr key={rate.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
                      <div><b>{rate.location?.name ?? "Unknown location"}</b><p className="text-xs text-muted-foreground">{[rate.location?.destination?.name, rate.location?.destination?.region?.name].filter(Boolean).join(" · ") || "—"}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><b>{rate.category.name}</b><p className="text-xs text-muted-foreground">{rate.meal_plan}</p></td>
                  <td className="px-5 py-4 font-semibold">{money(rate.base_room_rate_paise)}</td>
                  <td className="px-5 py-4">{money(rate.extra_adult_bed_paise)}</td>
                  <td className="px-5 py-4">{rate.child_pricing_policy === "adult_rate" ? "Adult rate applies" : `${money(rate.child_with_bed_paise)} / ${money(rate.child_without_bed_paise)}`}</td>
                  <td className="px-5 py-4"><span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium capitalize">{rate.status}</span></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" aria-label="Edit location rate" onClick={() => setEditor(rate)} className="rounded-lg p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="Delete location rate" disabled={busyId === rate.id} onClick={() => void remove(rate)} className="rounded-lg p-2 text-destructive hover:bg-destructive/5">{busyId === rate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div></td>
                </tr>
              )) : <tr><td colSpan={7} className="p-16 text-center text-muted-foreground"><IndianRupee className="mx-auto mb-3 h-8 w-8" /><p className="font-medium text-foreground">No location pricing found</p><p className="text-xs">Add a reusable location and category rate.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <DataPagination page={page} totalPages={totalPages} count={count} limit={limit} />
      {editor && <LocationRateDialog initial={editor === "new" ? null : editor} locations={locations} categories={categories} onClose={() => setEditor(null)} />}
    </div>
  );
}

function LocationRateDialog({ initial, locations, categories, onClose }: { initial: HotelLocationRate | null; locations: HotelPricingLocation[]; categories: HotelCategory[]; onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    location_id: initial?.location_id ?? "",
    category_id: initial?.category_id ?? categories[0]?.id ?? "",
    meal_plan: initial?.meal_plan ?? "CP" as MealPlan,
    base: initial ? toRupees(initial.base_room_rate_paise) : "",
    adult: initial ? toRupees(initial.extra_adult_bed_paise) : "",
    childBed: initial ? toRupees(initial.child_with_bed_paise) : "",
    childShare: initial ? toRupees(initial.child_without_bed_paise) : "",
    infant: initial ? toRupees(initial.infant_sharing_paise) : "0",
    policy: initial?.child_pricing_policy ?? "child_rates" as ChildPricingPolicy,
    childBedAllowed: initial?.child_with_bed_allowed ?? true,
    childShareAllowed: initial?.child_without_bed_allowed ?? true,
    notes: initial?.notes ?? "",
    status: initial?.status ?? "active" as "active" | "inactive",
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const amounts = [form.base, form.adult, form.childBed, form.childShare, form.infant];
    if (!form.location_id || !form.category_id) { setError("Select a location and category."); return; }
    if (amounts.some((value) => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0)) { setError("All pricing fields must contain zero or a positive amount."); return; }
    setSaving(true);
    try {
      const result = await saveHotelLocationRate(initial?.id ?? null, {
        location_id: form.location_id,
        category_id: form.category_id,
        hotel_id: null,
        room_id: null,
        meal_plan: form.meal_plan,
        base_room_rate_paise: toPaise(form.base),
        extra_adult_bed_paise: toPaise(form.adult),
        child_with_bed_paise: toPaise(form.childBed),
        child_without_bed_paise: toPaise(form.childShare),
        infant_sharing_paise: toPaise(form.infant),
        child_pricing_policy: form.policy,
        child_with_bed_allowed: form.policy === "adult_rate" ? true : form.childBedAllowed,
        child_without_bed_allowed: form.policy === "adult_rate" ? false : form.childShareAllowed,
        currency: "INR",
        tax_included: true,
        notes: form.notes.trim() || null,
        status: form.status,
      });
      if (!result.success) { setError(result.error); return; }
      router.refresh();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The location rate could not be saved.");
    } finally { setSaving(false); }
  }

  return <Dialog open onOpenChange={(open) => !open && !saving && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{initial ? "Edit location rate" : "Add location rate"}</DialogTitle><DialogDescription>One reusable, tax-inclusive rate for a location, hotel category and meal plan. Every hotel without an override inherits it automatically.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5">{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><VehicleSearchableSelect label="Location" name="location_id" value={form.location_id} options={locations.map((location) => ({ value: location.id, label: location.name, description: [location.destination?.name, location.destination?.region?.name].filter(Boolean).join(" · ") }))} onValueChange={(value) => set("location_id", value)} placeholder="Search location" required/><label className="space-y-1.5 text-sm font-medium">Hotel category<select className={selectClass} value={form.category_id} onChange={(event) => set("category_id", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Meal plan<select className={selectClass} value={form.meal_plan} onChange={(event) => set("meal_plan", event.target.value as MealPlan)}><option value="EP">EP · Room only</option><option value="CP">CP · Breakfast</option><option value="MAP">MAP · Breakfast + one meal</option><option value="AP">AP · All meals</option></select></label><label className="space-y-1.5 text-sm font-medium">Status<select className={selectClass} value={form.status} onChange={(event) => set("status", event.target.value as "active" | "inactive")}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>{[["Base room rate (₹)", "base"], ["Extra adult bed (₹)", "adult"], ["Child with bed (₹)", "childBed"], ["Child parent sharing (₹)", "childShare"], ["Infant sharing (₹)", "infant"]].map(([label, key]) => <label key={key} className="space-y-1.5 text-sm font-medium">{label}<Input required type="number" min="0" step="0.01" value={String(form[key as keyof typeof form])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}/></label>)}<label className="space-y-1.5 text-sm font-medium">Child policy<select className={selectClass} value={form.policy} onChange={(event) => set("policy", event.target.value as ChildPricingPolicy)}><option value="child_rates">Use child rates</option><option value="adult_rate">Treat child as adult</option></select></label>{form.policy === "child_rates" && <div className="flex flex-col justify-center gap-3 rounded-xl border p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.childBedAllowed} onChange={(event) => set("childBedAllowed", event.target.checked)}/>Child extra bed allowed</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.childShareAllowed} onChange={(event) => set("childShareAllowed", event.target.checked)}/>Child parent sharing allowed</label></div>}<label className="space-y-1.5 text-sm font-medium sm:col-span-2">Internal notes<Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)}/></label></div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save location rate</Button></DialogFooter></form></DialogContent></Dialog>;
}
