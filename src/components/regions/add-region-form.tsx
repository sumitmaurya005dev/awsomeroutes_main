"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

import { createRegionAction } from "@/actions/regions/actions";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { Button } from "@/components/ui/button";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";

type CountryOption = { id: string; name: string };

export function AddRegionForm({ countries }: { countries: CountryOption[] }) {
  const [saving, setSaving] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ country_id: "", name: "", slug: "", description: "", status: "active" as "active" | "inactive", image_url: "", image_asset_id: "" });

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createRegionAction({
      country_id: form.country_id,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      image_asset_id: form.image_asset_id || null,
      status: form.status,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to create region.");
      return;
    }
    window.location.href = "/home/regions";
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">Country<select value={form.country_id} onChange={(event) => update("country_id", event.target.value)} required disabled={saving} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Select country</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
          <label className="space-y-2 text-sm font-medium">Status<select value={form.status} onChange={(event) => update("status", event.target.value)} disabled={saving} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label className="space-y-2 text-sm font-medium">Region name<input value={form.name} onChange={(event) => update("name", event.target.value)} required disabled={saving} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Arunachal Pradesh" /></label>
          <label className="space-y-2 text-sm font-medium">Slug<input value={form.slug} onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/\s+/g, "-"))} required disabled={saving} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="arunachal-pradesh" /></label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} disabled={saving} className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-sm" placeholder="Optional description" /></label>
          <div className="space-y-2 sm:col-span-2"><p className="text-sm font-medium">Region image</p>{form.image_url && <div className="relative overflow-hidden rounded-xl border border-border"><Image src={form.image_url} alt={form.name || "Region image"} width={800} height={360} unoptimized className="h-44 w-full object-cover" /><button type="button" onClick={() => setForm((current) => ({ ...current, image_url: "", image_asset_id: "" }))} className="absolute right-3 top-3 rounded-full bg-destructive p-2 text-destructive-foreground"><X className="h-4 w-4" /></button></div>}<Button type="button" variant="outline" onClick={() => setPickerOpen(true)} disabled={saving} className="w-full"><ImagePlus className="mr-2 h-4 w-4" />{form.image_url ? "Change image" : "Choose or upload image"}</Button></div>
        </div>
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={saving} onClick={() => { window.location.href = "/home/regions"; }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Region"}</Button></div>
      </form>
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} folder={MEDIA_FOLDERS.REGIONS} fileNamePrefix={form.slug || "region"} altText={form.name || "Region image"} onSelect={(asset) => setForm((current) => ({ ...current, image_url: asset.original_url, image_asset_id: asset.id }))} />
    </>
  );
}
