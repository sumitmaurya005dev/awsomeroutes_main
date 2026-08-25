"use client";

import * as React from "react";
import { createCountryAction } from "@/actions/countries/actions";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";
import { useRouter } from "next/navigation";

export function AddCountryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    iso_code: "",
    phone_code: "",
    status: "active",
    image_url: "",
    image_asset_id: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCountryAction({
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        iso_code: formData.iso_code.trim().toUpperCase(),
        phone_code: formData.phone_code.trim(),
        status: formData.status as "active" | "inactive",
        image_url: formData.image_url.trim() || null,
        image_asset_id: formData.image_asset_id || null,
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      /*
       * Country successfully created.
       *
       * Do a complete browser navigation so:
       * 1. /home/countries server component runs again
       * 2. getCountries() fetches fresh data
       * 3. newly created country appears immediately
       */
      router.push("/home/countries");
      router.refresh();
    } catch (error) {
      console.error("Create country form error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create country",
      );

      setIsSubmitting(false);
    }
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Country Name */}
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="text-sm font-medium text-foreground"
          >
            Country Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="India"
            required
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <label
            htmlFor="slug"
            className="text-sm font-medium text-foreground"
          >
            Slug
          </label>

          <input
            id="slug"
            name="slug"
            type="text"
            value={formData.slug}
            onChange={handleChange}
            placeholder="india"
            required
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* ISO Code */}
        <div className="space-y-2">
          <label
            htmlFor="iso_code"
            className="text-sm font-medium text-foreground"
          >
            ISO Code
          </label>

          <input
            id="iso_code"
            name="iso_code"
            type="text"
            value={formData.iso_code}
            onChange={handleChange}
            placeholder="IN"
            maxLength={2}
            required
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm uppercase text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Phone Code */}
        <div className="space-y-2">
          <label
            htmlFor="phone_code"
            className="text-sm font-medium text-foreground"
          >
            Phone Code
          </label>

          <input
            id="phone_code"
            name="phone_code"
            type="text"
            value={formData.phone_code}
            onChange={handleChange}
            placeholder="+91"
            required
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label
            htmlFor="status"
            className="text-sm font-medium text-foreground"
          >
            Status
          </label>

          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Image */}
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">Country Image</label>
          {formData.image_url ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
              <Image src={formData.image_url} alt={formData.name || "Country image"} width={800} height={360} unoptimized className="h-44 w-full object-cover" />
              <button type="button" onClick={() => setFormData((previous) => ({ ...previous, image_url: "", image_asset_id: "" }))} disabled={isSubmitting} className="absolute right-3 top-3 rounded-full bg-destructive p-2 text-destructive-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : null}
          <Button type="button" variant="outline" onClick={() => setMediaPickerOpen(true)} disabled={isSubmitting} className="w-full">
            <ImagePlus className="mr-2 h-4 w-4" />
            {formData.image_url ? "Change image" : "Choose or upload image"}
          </Button>
          <p className="text-xs text-muted-foreground">Select a reusable image from the Media Library or upload a new one.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            router.push("/home/countries");
          }}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save Country"}
        </button>
      </div>
    </form>
    <MediaPickerDialog
      open={mediaPickerOpen}
      onOpenChange={setMediaPickerOpen}
      folder={MEDIA_FOLDERS.COUNTRIES}
      fileNamePrefix={formData.slug || "country"}
      altText={formData.name || "Country image"}
      onSelect={(asset) => setFormData((previous) => ({ ...previous, image_url: asset.original_url, image_asset_id: asset.id }))}
    />
    </>
  );
}
