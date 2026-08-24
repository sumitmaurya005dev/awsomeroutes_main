"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";
import {
  createDestinationAction,
  updateDestinationAction,
} from "@/actions/destinations/actions";
import type { Destination } from "@/types/destination";

type RegionOption = { id: string; name: string; countryName: string };
type FormState = {
  region_id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string;
  image_asset_id: string;
  latitude: string;
  longitude: string;
  status: "active" | "inactive";
};
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
const asNumber = (value: string) =>
  value.trim() === "" ? null : Number(value);

export function DestinationForm({
  regions,
  initial,
  onSuccess,
}: {
  regions: RegionOption[];
  initial?: Destination;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>({
    region_id: initial?.region_id ?? "",
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    image_url: initial?.image_url ?? "",
    image_asset_id: initial?.image_asset_id ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    status: initial?.status === "inactive" ? "inactive" : "active",
  });
  const update = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const values = {
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      image_asset_id: form.image_asset_id || null,
      latitude: asNumber(form.latitude),
      longitude: asNumber(form.longitude),
    };
    const result = initial
      ? await updateDestinationAction(initial.id, values)
      : await createDestinationAction(values);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save destination.");
      return;
    }
    if (onSuccess) {
      onSuccess();
      router.refresh();
    } else window.location.href = "/home/destinations";
  };
  return (
    <>
      <form
        onSubmit={submit}
        className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Region
            <select
              required
              value={form.region_id}
              onChange={(e) => update("region_id", e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Select region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name} · {region.countryName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Destination name
            <input
              required
              value={form.name}
              onChange={(e) => {
                update("name", e.target.value);
                if (!initial) update("slug", slugify(e.target.value));
              }}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Tawang"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Slug
            <input
              required
              value={form.slug}
              onChange={(e) => update("slug", slugify(e.target.value))}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="tawang"
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Short description
            <textarea
              value={form.short_description}
              onChange={(e) => update("short_description", e.target.value)}
              disabled={saving}
              className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm"
              placeholder="Short summary for cards and SEO."
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Full description
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={saving}
              className="min-h-32 w-full rounded-lg border border-border bg-background p-3 text-sm"
              placeholder="Detailed destination content."
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Latitude
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Longitude
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Status
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Destination image</p>
            {form.image_url && (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <Image
                  src={form.image_url}
                  alt={form.name || "Destination"}
                  width={900}
                  height={400}
                  unoptimized
                  className="h-44 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      image_url: "",
                      image_asset_id: "",
                    }))
                  }
                  className="absolute right-3 top-3 rounded-full bg-destructive p-2 text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              disabled={saving}
              className="w-full"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {form.image_url ? "Change image" : "Choose or upload image"}
            </Button>
          </div>
        </div>
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (onSuccess) onSuccess();
              else window.location.href = "/home/destinations";
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : initial
                ? "Save changes"
                : "Save destination"}
          </Button>
        </div>
      </form>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        folder={MEDIA_FOLDERS.DESTINATIONS}
        fileNamePrefix={form.slug || "destination"}
        altText={form.name || "Destination image"}
        onSelect={(asset) =>
          setForm((current) => ({
            ...current,
            image_url: asset.original_url,
            image_asset_id: asset.id,
          }))
        }
      />
    </>
  );
}
