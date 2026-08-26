"use client";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CircleCheck,
  Clock3,
  ImagePlus,
  Images,
  Loader2,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { HotelLocationCombobox } from "./hotel-location-combobox";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";
import { createHotel, updateHotel } from "@/lib/hotels/mutations";
import type {
  HotelAmenity,
  HotelAsset,
  HotelDetail,
  HotelLocationOption,
  HotelStatus,
} from "@/types/hotel";

const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const numberOrNull = (v: string) => (v.trim() ? Number(v) : null);
const section =
  "space-y-5 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6";
const select = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b pb-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
function initialLocation(h?: HotelDetail | null): HotelLocationOption | null {
  const l = h?.location;
  if (!l) return null;
  return {
    id: l.id,
    name: l.name,
    destinationName: l.destination?.name ?? "",
    regionName: l.destination?.region?.name ?? "",
    countryName: l.destination?.region?.country?.name ?? "",
  };
}

export function HotelForm({
  initial,
  amenities,
  canBrowseMedia,
  canUploadMedia,
}: {
  initial?: HotelDetail | null;
  amenities: HotelAmenity[];
  canBrowseMedia: boolean;
  canUploadMedia: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false),
    [error, setError] = React.useState<string | null>(null),
    [message, setMessage] = React.useState<string | null>(null),
    [picker, setPicker] = React.useState<"featured" | "gallery" | null>(null),
    [slugTouched, setSlugTouched] = React.useState(Boolean(initial));
  const [featured, setFeatured] = React.useState<HotelAsset | null>(
      initial?.featured_image ?? null,
    ),
    [gallery, setGallery] = React.useState<HotelAsset[]>(
      initial?.gallery
        .map((x) => x.media_asset)
        .filter((x): x is HotelAsset => Boolean(x)) ?? [],
    ),
    [amenityIds, setAmenityIds] = React.useState<string[]>(
      initial?.amenities.map((x) => x.amenity_id) ?? [],
    );
  const [form, setForm] = React.useState({
    location_id: initial?.location_id ?? "",
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    website_url: initial?.website_url ?? "",
    star_rating: initial?.star_rating?.toString() ?? "",
    check_in_time: initial?.check_in_time?.slice(0, 5) ?? "14:00",
    check_out_time: initial?.check_out_time?.slice(0, 5) ?? "11:00",
    policies: initial?.policies ?? "",
    status: initial?.status ?? "draft",
    is_featured: initial?.is_featured ?? false,
    seo_title: initial?.seo_title ?? "",
    seo_description: initial?.seo_description ?? "",
  });
  const set = (key: string, value: string | boolean) =>
    setForm((x) => ({ ...x, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.location_id) {
      setError("Select a hotel location.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const values = {
      location_id: form.location_id,
      name: form.name,
      slug: form.slug,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      latitude: numberOrNull(form.latitude),
      longitude: numberOrNull(form.longitude),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website_url: form.website_url.trim() || null,
      star_rating: numberOrNull(form.star_rating),
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      policies: form.policies.trim() || null,
      featured_image_asset_id: featured?.id ?? null,
      gallery_asset_ids: gallery.map((x) => x.id),
      amenity_ids: amenityIds,
      status: form.status as HotelStatus,
      is_featured: form.is_featured,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
    };
    try {
      const result = initial
        ? await updateHotel(initial.id, values)
        : await createHotel(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!initial) {
        router.push(`/home/hotels/${result.data.id}/edit`);
        return;
      }
      setMessage("Hotel details saved successfully.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Hotel could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={section}>
        <SectionHeading
          icon={Building2}
          title="Hotel information"
          description="Identity, location and website content."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Location
            <HotelLocationCombobox
              value={form.location_id}
              initialOption={initialLocation(initial)}
              disabled={saving}
              onChange={(x) => set("location_id", x.id)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Hotel name
            <Input
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((x) => ({
                  ...x,
                  name,
                  slug: slugTouched ? x.slug : slugify(name),
                }));
              }}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Slug
            <Input
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Status
            <select
              className={select}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="temporarily_unavailable">
                Temporarily unavailable
              </option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Star rating
            <Input
              type="number"
              min="0"
              max="5"
              step="0.5"
              value={form.star_rating}
              onChange={(e) => set("star_rating", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Short description
            <Textarea
              maxLength={350}
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Detailed description
            <Textarea
              className="min-h-36"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Address
            <Textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </label>
          <label
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-colors sm:col-span-2 ${
              form.is_featured
                ? "border-primary/40 bg-primary/5"
                : "bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <span>
              <span className="block font-medium">Featured hotel</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Highlight this hotel in curated website sections.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.is_featured}
              onChange={(e) => set("is_featured", e.target.checked)}
            />
          </label>
        </div>
      </section>
      <section className={section}>
        <SectionHeading
          icon={Clock3}
          title="Contact and operations"
          description="Guest contact details, arrival times and property policies."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm font-medium">
            Phone
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Check-in
            <Input
              type="time"
              value={form.check_in_time}
              onChange={(e) => set("check_in_time", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Check-out
            <Input
              type="time"
              value={form.check_out_time}
              onChange={(e) => set("check_out_time", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Website URL
            <Input
              type="url"
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Latitude
            <Input
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Longitude
            <Input
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={(e) => set("longitude", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-4">
            Hotel policies
            <Textarea
              value={form.policies}
              onChange={(e) => set("policies", e.target.value)}
            />
          </label>
        </div>
      </section>
      <section className={section}>
        <SectionHeading
          icon={Sparkles}
          title="Amenities"
          description={`${amenityIds.length} selected · choose everything available at this hotel.`}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {amenities.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-all ${
                amenityIds.includes(a.id)
                  ? "border-primary/40 bg-primary/5 text-foreground shadow-sm"
                  : "bg-background hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <span>{a.name}</span>
              <span
                className={`grid h-5 w-5 place-items-center rounded-md border ${
                  amenityIds.includes(a.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {amenityIds.includes(a.id) && <Check className="h-3.5 w-3.5" />}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={amenityIds.includes(a.id)}
                onChange={(e) =>
                  setAmenityIds((x) =>
                    e.target.checked
                      ? [...x, a.id]
                      : x.filter((id) => id !== a.id),
                  )
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className={section}>
        <SectionHeading
          icon={Images}
          title="Hotel images"
          description="Choose a cover image and reusable gallery images from the Hotels folder."
        />
        {!canBrowseMedia && (
          <p className="text-sm text-muted-foreground">
            media.view permission is required to choose images.
          </p>
        )}
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <p className="text-sm font-medium">Featured image</p>
            {featured ? (
              <div className="overflow-hidden rounded-xl border">
                {featured.original_url && (
                  <Image
                    src={featured.original_url}
                    alt={featured.alt_text ?? form.name}
                    width={560}
                    height={320}
                    unoptimized
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="flex gap-2 p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPicker("featured")}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setFeatured(null)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canBrowseMedia}
                onClick={() => setPicker("featured")}
                className="group grid h-40 w-full place-items-center rounded-xl border border-dashed bg-muted/20 transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
              >
                <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground group-hover:text-primary">
                  <ImagePlus className="h-6 w-6" />
                  Choose cover image
                </span>
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm font-medium">
                Gallery ({gallery.length}/40)
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canBrowseMedia || gallery.length >= 40}
                onClick={() => setPicker("gallery")}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {!gallery.length && (
                <button
                  type="button"
                  disabled={!canBrowseMedia}
                  onClick={() => setPicker("gallery")}
                  className="col-span-full grid h-24 place-items-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  Add lobby, rooms, exterior and view images
                </button>
              )}
              {gallery.map((x) => (
                <div
                  key={x.id}
                  className="relative overflow-hidden rounded-lg border"
                >
                  {x.original_url && (
                    <Image
                      src={x.original_url}
                      alt={x.alt_text ?? x.file_name}
                      width={240}
                      height={140}
                      unoptimized
                      className="h-24 w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setGallery((g) => g.filter((a) => a.id !== x.id))
                    }
                    className="absolute right-1 top-1 rounded bg-background/90 p-1 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className={section}>
        <SectionHeading
          icon={Search}
          title="Search visibility"
          description="Control how this hotel may appear in search results."
        />
        <div className="grid gap-4">
          <label className="space-y-2 text-sm font-medium">
            <span className="flex justify-between gap-3">
              <span>SEO title</span>
              <span className="text-xs font-normal text-muted-foreground">
                {form.seo_title.length}/70
              </span>
            </span>
            <Input
              maxLength={70}
              value={form.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span className="flex justify-between gap-3">
              <span>Meta description</span>
              <span className="text-xs font-normal text-muted-foreground">
                {form.seo_description.length}/170
              </span>
            </span>
            <Textarea
              maxLength={170}
              value={form.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
            />
          </label>
        </div>
      </section>
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-sm">
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CircleCheck className="h-4 w-4" />
              {message}
            </p>
          )}
          {!error && !message && (
            <p className="text-muted-foreground">
              {initial
                ? "Save changes before managing updated hotel content."
                : "Rooms and pricing can be added after creating the hotel."}
            </p>
          )}
        </div>
        <Button disabled={saving} type="submit" className="sm:min-w-36">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {initial ? "Save Hotel" : "Create Hotel"}
        </Button>
      </div>
      <MediaPickerDialog
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        folder={MEDIA_FOLDERS.HOTELS}
        fileNamePrefix={slugify(form.slug || form.name || "hotel")}
        altText={form.name}
        canUpload={canUploadMedia}
        onSelect={(asset) => {
          const selected: HotelAsset = {
            id: asset.id,
            original_url: asset.original_url,
            file_name: asset.file_name,
            alt_text: asset.alt_text,
          };
          if (picker === "featured") setFeatured(selected);
          else
            setGallery((x) =>
              x.some((a) => a.id === selected.id) ? x : [...x, selected],
            );
        }}
      />
    </form>
  );
}
