"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Baby,
  BedDouble,
  Building2,
  ImagePlus,
  IndianRupee,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
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
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";
import {
  deleteHotelRate,
  deleteHotelRoom,
  saveHotelRate,
  saveHotelRoom,
} from "@/lib/hotels/mutations";
import type {
  HotelAsset,
  HotelCategory,
  HotelDetail,
  HotelRateCard,
  HotelRoom,
  MealPlan,
} from "@/types/hotel";

const select = "h-10 w-full rounded-lg border bg-background px-3 text-sm";
const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const paise = (v: string) => Math.round((Number(v) || 0) * 100),
  rupees = (v: number) => String(v / 100),
  optional = (v: string) => (v.trim() ? Number(v) : null);
const money = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v / 100);

export function HotelManagementPanels({
  hotel,
  categories,
  canAddRoom,
  canUpdate,
  canManagePricing,
  canOverridePrice,
  canDelete,
  canBrowseMedia,
  canUploadMedia,
}: {
  hotel: HotelDetail;
  categories: HotelCategory[];
  canAddRoom: boolean;
  canUpdate: boolean;
  canManagePricing: boolean;
  canOverridePrice: boolean;
  canDelete: boolean;
  canBrowseMedia: boolean;
  canUploadMedia: boolean;
}) {
  const router = useRouter();
  const [roomEditor, setRoomEditor] = React.useState<HotelRoom | "new" | null>(
      null,
    ),
    [rateEditor, setRateEditor] = React.useState<HotelRateCard | "new" | null>(
      null,
    ),
    [busy, setBusy] = React.useState<string | null>(null),
    [error, setError] = React.useState<string | null>(null);
  async function removeRoom(r: HotelRoom) {
    if (!confirm(`Delete room ${r.name}?`)) return;
    setBusy(r.id);
    const result = await deleteHotelRoom(r.id, hotel.id);
    if (!result.success) setError(result.error);
    else router.refresh();
    setBusy(null);
  }
  async function removeRate(r: HotelRateCard) {
    if (!confirm("Delete this rate card?")) return;
    setBusy(r.id);
    const result = await deleteHotelRate(r.id, hotel.id);
    if (!result.success) setError(result.error);
    else router.refresh();
    setBusy(null);
  }
  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <BedDouble className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Room types</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {hotel.rooms.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Category, capacity, extra-bed limits and room images.
              </p>
            </div>
          </div>
          {canAddRoom && (
            <Button type="button" onClick={() => setRoomEditor("new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add room
            </Button>
          )}
        </div>
        {hotel.rooms.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {hotel.rooms.map((r) => (
              <article
                key={r.id}
                className="group overflow-hidden rounded-2xl border bg-background transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex gap-4 p-4">
                {r.featured_image?.original_url ? (
                  <Image
                    src={r.featured_image.original_url}
                    alt={r.name}
                    width={100}
                    height={90}
                    unoptimized
                    className="h-24 w-28 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-28 place-items-center rounded-xl border bg-muted/40 text-muted-foreground">
                    <BedDouble className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{r.name}</h3>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {r.category.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.bed_type || "Bed not specified"}
                      </p>
                    </div>
                    {(canUpdate || canDelete) && (
                      <div className="flex">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => setRoomEditor(r)}
                            className="p-2"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => removeRoom(r)}
                            className="p-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Base {r.base_adults} · Max {r.maximum_occupancy}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground">
                      <BedDouble className="h-3.5 w-3.5" /> {r.maximum_extra_beds} extra bed
                    </span>
                  </div>
                </div>
                </div>
                <div className="grid grid-cols-2 border-t bg-muted/15 text-xs">
                  <div className="flex items-center gap-2 border-r px-4 py-2.5">
                    <Baby className="h-3.5 w-3.5 text-primary" />
                    Child sharing {r.child_sharing_allowed ? "allowed" : "off"}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <Baby className="h-3.5 w-3.5 text-primary" />
                    Infant sharing {r.infant_sharing_allowed ? "allowed" : "off"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl border border-dashed bg-muted/10 text-center text-sm text-muted-foreground">
            <div className="space-y-2">
              <BedDouble className="mx-auto h-7 w-7" />
              <p>Add at least one room type before creating room overrides.</p>
            </div>
          </div>
        )}
      </section>
      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Tax-inclusive rate cards</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {hotel.rates.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Location defaults are reusable; overrides handle exceptions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManagePricing && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/home/hotels/pricing?locationId=${hotel.location_id}`} />}
              >
                <MapPin className="mr-2 h-4 w-4" />Location pricing
              </Button>
            )}
            {canManagePricing && canOverridePrice && (
              <Button type="button" onClick={() => setRateEditor("new")}>
                <IndianRupee className="mr-2 h-4 w-4" />Add override
              </Button>
            )}
          </div>
        </div>
        {hotel.rates.length ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 text-left">Scope</th>
                  <th className="p-3 text-left">Category / meal</th>
                  <th className="p-3 text-left">Room</th>
                  <th className="p-3 text-left">Adult bed</th>
                  <th className="p-3 text-left">Child bed/share</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hotel.rates.map((r) => {
                  const room = hotel.rooms.find((x) => x.id === r.room_id);
                  return (
                    <tr key={r.id}>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium">
                          {r.room_id ? (
                            <BedDouble className="h-3.5 w-3.5 text-primary" />
                          ) : r.hotel_id ? (
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                          )}
                          {r.room_id
                            ? room?.name ?? "Unknown room"
                            : r.hotel_id
                              ? "Hotel override"
                              : "Location default"}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{r.category.name}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UtensilsCrossed className="h-3 w-3" /> {r.meal_plan}
                        </p>
                      </td>
                      <td className="p-3 font-medium">
                        {money(r.base_room_rate_paise)}
                      </td>
                      <td className="p-3">{money(r.extra_adult_bed_paise)}</td>
                      <td className="p-3">
                        {r.child_pricing_policy === "adult_rate"
                          ? "Adult rate"
                          : `${money(r.child_with_bed_paise)} / ${money(r.child_without_bed_paise)}`}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          {!r.hotel_id && canManagePricing ? (
                            <Link
                              href={`/home/hotels/pricing?locationId=${hotel.location_id}`}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              Manage centrally
                            </Link>
                          ) : canManagePricing && canOverridePrice ? (
                              <button
                                type="button"
                                onClick={() => setRateEditor(r)}
                                className="p-2"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            ) : null}
                          {r.hotel_id && canManagePricing && canOverridePrice && (
                              <button
                                type="button"
                                disabled={busy === r.id}
                                onClick={() => removeRate(r)}
                                className="p-2 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl border border-dashed bg-muted/10 text-center text-sm text-muted-foreground">
            <div className="space-y-2">
              <IndianRupee className="mx-auto h-7 w-7" />
              <p>No pricing configured for this location.</p>
            </div>
          </div>
        )}
      </section>
      {roomEditor && (
        <RoomDialog
          hotelId={hotel.id}
          categories={categories}
          initial={roomEditor === "new" ? null : roomEditor}
          canBrowseMedia={canBrowseMedia}
          canUploadMedia={canUploadMedia}
          onClose={() => setRoomEditor(null)}
        />
      )}{" "}
      {rateEditor && (
        <RateDialog
          hotel={hotel}
          categories={categories}
          initial={rateEditor === "new" ? null : rateEditor}
          canOverridePrice={canOverridePrice}
          onClose={() => setRateEditor(null)}
        />
      )}
    </div>
  );
}

function RoomDialog({
  hotelId,
  categories,
  initial,
  canBrowseMedia,
  canUploadMedia,
  onClose,
}: {
  hotelId: string;
  categories: HotelCategory[];
  initial: HotelRoom | null;
  canBrowseMedia: boolean;
  canUploadMedia: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false),
    [error, setError] = React.useState<string | null>(null),
    [picker, setPicker] = React.useState<"featured" | "gallery" | null>(null),
    [featured, setFeatured] = React.useState<HotelAsset | null>(
      initial?.featured_image ?? null,
    ),
    [gallery, setGallery] = React.useState<HotelAsset[]>(
      initial?.gallery
        .map((x) => x.media_asset)
        .filter((x): x is HotelAsset => Boolean(x)) ?? [],
    );
  const [form, setForm] = React.useState({
    category_id: initial?.category_id ?? categories[0]?.id ?? "",
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    bed_type: initial?.bed_type ?? "Double bed",
    room_size_sqft: initial?.room_size_sqft?.toString() ?? "",
    base_adults: String(initial?.base_adults ?? 2),
    maximum_adults: String(initial?.maximum_adults ?? 3),
    maximum_children: String(initial?.maximum_children ?? 2),
    maximum_occupancy: String(initial?.maximum_occupancy ?? 4),
    maximum_extra_beds: String(initial?.maximum_extra_beds ?? 1),
    child_sharing_allowed: initial?.child_sharing_allowed ?? true,
    infant_sharing_allowed: initial?.infant_sharing_allowed ?? true,
    inventory_count: initial?.inventory_count?.toString() ?? "",
    display_order: String(initial?.display_order ?? 0),
    status: initial?.status ?? "active",
  });
  const set = (k: string, v: string | boolean) =>
    setForm((x) => ({ ...x, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const roomName = form.name.trim();
    const roomSlug = slugify(form.slug || roomName);
    const baseAdults = Number(form.base_adults);
    const maximumAdults = Number(form.maximum_adults);
    const maximumChildren = Number(form.maximum_children);
    const maximumOccupancy = Number(form.maximum_occupancy);
    const maximumExtraBeds = Number(form.maximum_extra_beds);

    if (!roomName || !roomSlug) {
      setError("Enter a valid room name and slug.");
      return;
    }
    if (!form.category_id) {
      setError("Select a package category before saving the room.");
      return;
    }
    if (
      !Number.isInteger(baseAdults) ||
      baseAdults < 1 ||
      !Number.isInteger(maximumAdults) ||
      maximumAdults < baseAdults
    ) {
      setError("Maximum adults must be equal to or greater than base adults.");
      return;
    }
    if (
      !Number.isInteger(maximumChildren) ||
      maximumChildren < 0 ||
      !Number.isInteger(maximumOccupancy) ||
      maximumOccupancy < maximumAdults ||
      !Number.isInteger(maximumExtraBeds) ||
      maximumExtraBeds < 0
    ) {
      setError(
        "Check the children, occupancy and extra-bed values before saving.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveHotelRoom(initial?.id ?? null, {
        hotel_id: hotelId,
        category_id: form.category_id,
        name: roomName,
        slug: roomSlug,
        description: form.description.trim() || null,
        bed_type: form.bed_type.trim() || null,
        room_size_sqft: optional(form.room_size_sqft),
        base_adults: baseAdults,
        maximum_adults: maximumAdults,
        maximum_children: maximumChildren,
        maximum_occupancy: maximumOccupancy,
        maximum_extra_beds: maximumExtraBeds,
        child_sharing_allowed: form.child_sharing_allowed,
        infant_sharing_allowed: form.infant_sharing_allowed,
        inventory_count: optional(form.inventory_count),
        featured_image_asset_id: featured?.id ?? null,
        gallery_asset_ids: gallery.map((x) => x.id),
        display_order: Number(form.display_order),
        status: form.status as "active" | "inactive",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The room could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <BedDouble className="h-4 w-4" />
              </span>
              {initial ? "Edit room type" : "Add room type"}
            </DialogTitle>
            <DialogDescription>
              Room-level package category, occupancy and gallery.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={submit}
            onInvalid={(event) => {
              event.preventDefault();
              setError("Complete all required room fields before saving.");
            }}
            className="space-y-4"
          >
            {error && (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Room name
                <Input
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((x) => ({
                      ...x,
                      name,
                      slug: initial ? x.slug : slugify(name),
                    }));
                  }}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Slug
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Package category
                <select
                  required
                  className={select}
                  value={form.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                >
                  {categories.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Bed type
                <Input
                  value={form.bed_type}
                  onChange={(e) => set("bed_type", e.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Description
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
              {[
                ["Base adults", "base_adults"],
                ["Maximum adults", "maximum_adults"],
                ["Maximum children", "maximum_children"],
                ["Maximum occupancy", "maximum_occupancy"],
                ["Maximum extra beds", "maximum_extra_beds"],
                ["Inventory (optional)", "inventory_count"],
              ].map(([label, key]) => (
                <label key={key} className="space-y-2 text-sm font-medium">
                  {label}
                  <Input
                    type="number"
                    min="0"
                    value={String(form[key as keyof typeof form])}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </label>
              ))}
              <label className="space-y-2 text-sm font-medium">
                Room size (sq. ft.)
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Optional"
                  value={form.room_size_sqft}
                  onChange={(e) => set("room_size_sqft", e.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Display order
                <Input
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={(e) => set("display_order", e.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Status
                <select
                  className={select}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Occupancy summary</p>
                <p className="mt-1">
                  Base {form.base_adults || "0"} adult(s), maximum{" "}
                  {form.maximum_occupancy || "0"} total guest(s), with up to{" "}
                  {form.maximum_extra_beds || "0"} extra bed(s).
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.child_sharing_allowed}
                  onChange={(e) =>
                    set("child_sharing_allowed", e.target.checked)
                  }
                />
                Child parent-sharing allowed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.infant_sharing_allowed}
                  onChange={(e) =>
                    set("infant_sharing_allowed", e.target.checked)
                  }
                />
                Infant sharing complimentary/allowed
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canBrowseMedia}
                  onClick={() => setPicker("featured")}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Featured image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canBrowseMedia || gallery.length >= 20}
                  onClick={() => setPicker("gallery")}
                >
                  Add gallery image
                </Button>
              </div>
              {featured?.original_url && (
                <Image
                  src={featured.original_url}
                  alt={form.name}
                  width={240}
                  height={120}
                  unoptimized
                  className="h-24 w-40 rounded-lg object-cover"
                />
              )}
              <div className="flex flex-wrap gap-2">
                {gallery.map(
                  (x) =>
                    x.original_url && (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() =>
                          setGallery((g) => g.filter((a) => a.id !== x.id))
                        }
                        title="Remove image"
                      >
                        <Image
                          src={x.original_url}
                          alt={x.file_name}
                          width={90}
                          height={70}
                          unoptimized
                          className="h-16 w-20 rounded object-cover"
                        />
                      </button>
                    ),
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || categories.length === 0}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <MediaPickerDialog
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        folder={MEDIA_FOLDERS.HOTELS}
        fileNamePrefix={`room-${slugify(form.slug || form.name || "image")}`}
        altText={form.name}
        canUpload={canUploadMedia}
        onSelect={(asset) => {
          const x: HotelAsset = {
            id: asset.id,
            original_url: asset.original_url,
            file_name: asset.file_name,
            alt_text: asset.alt_text,
          };
          if (picker === "featured") setFeatured(x);
          else
            setGallery((g) => (g.some((a) => a.id === x.id) ? g : [...g, x]));
        }}
      />
    </>
  );
}

function RateDialog({
  hotel,
  categories,
  initial,
  canOverridePrice,
  onClose,
}: {
  hotel: HotelDetail;
  categories: HotelCategory[];
  initial: HotelRateCard | null;
  canOverridePrice: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false),
    [error, setError] = React.useState<string | null>(null);
  const initialScope = initial?.room_id
    ? "room"
    : initial?.hotel_id
      ? "hotel"
      : canOverridePrice
        ? "hotel"
        : "location";
  const initialCategoryId = initial?.category_id ?? categories[0]?.id ?? "";
  const initialMealPlan = initial?.meal_plan ?? "CP";
  const initialInherited = initial
    ? undefined
    : hotel.rates.find(
        (rate) =>
          !rate.hotel_id &&
          !rate.room_id &&
          rate.status === "active" &&
          rate.category_id === initialCategoryId &&
          rate.meal_plan === initialMealPlan,
      );
  const [form, setForm] = React.useState({
    scope: initialScope,
    category_id: initialCategoryId,
    room_id: initial?.room_id ?? "",
    meal_plan: initialMealPlan,
    base: initial
      ? rupees(initial.base_room_rate_paise)
      : initialInherited
        ? rupees(initialInherited.base_room_rate_paise)
        : "",
    adult: initial
      ? rupees(initial.extra_adult_bed_paise)
      : initialInherited
        ? rupees(initialInherited.extra_adult_bed_paise)
        : "",
    childBed: initial
      ? rupees(initial.child_with_bed_paise)
      : initialInherited
        ? rupees(initialInherited.child_with_bed_paise)
        : "",
    childShare: initial
      ? rupees(initial.child_without_bed_paise)
      : initialInherited
        ? rupees(initialInherited.child_without_bed_paise)
        : "",
    infant: initial
      ? rupees(initial.infant_sharing_paise)
      : initialInherited
        ? rupees(initialInherited.infant_sharing_paise)
        : "0",
    policy:
      initial?.child_pricing_policy ??
      initialInherited?.child_pricing_policy ??
      "child_rates",
    childBedAllowed:
      initial?.child_with_bed_allowed ??
      initialInherited?.child_with_bed_allowed ??
      true,
    childShareAllowed:
      initial?.child_without_bed_allowed ??
      initialInherited?.child_without_bed_allowed ??
      true,
    notes: initial?.notes ?? "",
    status: initial?.status ?? "active",
  });
  const room = form.room_id
    ? hotel.rooms.find((x) => x.id === form.room_id)
    : null;
  const effectiveCategoryId =
    form.scope === "room" ? (room?.category_id ?? "") : form.category_id;
  const findLocationDefault = (categoryId: string, mealPlan: MealPlan) =>
    hotel.rates.find(
      (rate) =>
        !rate.hotel_id &&
        !rate.room_id &&
        rate.status === "active" &&
        rate.category_id === categoryId &&
        rate.meal_plan === mealPlan,
    );
  const findHotelOverride = (categoryId: string, mealPlan: MealPlan) =>
    hotel.rates.find(
      (rate) =>
        rate.hotel_id === hotel.id &&
        !rate.room_id &&
        rate.status === "active" &&
        rate.category_id === categoryId &&
        rate.meal_plan === mealPlan,
    );
  const locationDefault = findLocationDefault(
    effectiveCategoryId,
    form.meal_plan as MealPlan,
  );
  const inheritedRate =
    form.scope === "room"
      ? findHotelOverride(effectiveCategoryId, form.meal_plan as MealPlan) ??
        locationDefault
      : locationDefault;
  const scopeAllowed = form.scope !== "location" && canOverridePrice;
  const readOnlyPricing = form.scope === "location";

  function pricingPatch(rate: HotelRateCard | undefined) {
    return rate
      ? {
          base: rupees(rate.base_room_rate_paise),
          adult: rupees(rate.extra_adult_bed_paise),
          childBed: rupees(rate.child_with_bed_paise),
          childShare: rupees(rate.child_without_bed_paise),
          infant: rupees(rate.infant_sharing_paise),
          policy: rate.child_pricing_policy,
          childBedAllowed: rate.child_with_bed_allowed,
          childShareAllowed: rate.child_without_bed_allowed,
        }
      : {
          base: "",
          adult: "",
          childBed: "",
          childShare: "",
          infant: "0",
          policy: "child_rates" as const,
          childBedAllowed: true,
          childShareAllowed: true,
        };
  }

  function changeScope(scope: string) {
    setError(null);
    setForm((current) => {
      if (scope === "room")
        return { ...current, scope, room_id: "" };
      const fallback = findLocationDefault(
        current.category_id,
        current.meal_plan as MealPlan,
      );
      return { ...current, scope, room_id: "", ...pricingPatch(fallback) };
    });
  }

  function changeCategory(categoryId: string) {
    setForm((current) => {
      const fallback = findLocationDefault(
        categoryId,
        current.meal_plan as MealPlan,
      );
      return { ...current, category_id: categoryId, ...pricingPatch(fallback) };
    });
  }

  function changeMealPlan(mealPlan: MealPlan) {
    setForm((current) => {
      const selectedRoom = current.room_id
        ? hotel.rooms.find((item) => item.id === current.room_id)
        : null;
      const categoryId =
        current.scope === "room"
          ? (selectedRoom?.category_id ?? "")
          : current.category_id;
      const fallback =
        current.scope === "room"
          ? findHotelOverride(categoryId, mealPlan) ??
            findLocationDefault(categoryId, mealPlan)
          : findLocationDefault(categoryId, mealPlan);
      return { ...current, meal_plan: mealPlan, ...pricingPatch(fallback) };
    });
  }

  function changeRoom(roomId: string) {
    const selectedRoom = hotel.rooms.find((item) => item.id === roomId);
    const categoryId = selectedRoom?.category_id ?? "";
    const mealPlan = form.meal_plan as MealPlan;
    const fallback =
      findHotelOverride(categoryId, mealPlan) ??
      findLocationDefault(categoryId, mealPlan);
    setForm((current) => ({
      ...current,
      room_id: roomId,
      ...pricingPatch(fallback),
    }));
  }
  const previewBase = Math.max(0, Number(form.base) || 0);
  const previewExtraAdult = Math.max(0, Number(form.adult) || 0);
  const adultPricingPreview = [
    { pax: 2, rooms: 1, extraBeds: 0, total: previewBase },
    {
      pax: 3,
      rooms: 1,
      extraBeds: 1,
      total: previewBase + previewExtraAdult,
    },
    { pax: 4, rooms: 2, extraBeds: 0, total: previewBase * 2 },
    {
      pax: 5,
      rooms: 2,
      extraBeds: 1,
      total: previewBase * 2 + previewExtraAdult,
    },
    { pax: 6, rooms: 3, extraBeds: 0, total: previewBase * 3 },
  ];
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (form.scope === "location") {
      onClose();
      return;
    }

    if (!scopeAllowed) {
      setError(
        "hotels.override_price permission is required for hotel or room overrides.",
      );
      return;
    }

    if (form.scope === "room" && !room) {
      setError("Select a room before saving a room-level rate.");
      return;
    }

    const categoryId =
      form.scope === "room" ? (room?.category_id ?? "") : form.category_id;
    if (!categoryId) {
      setError("Select a package category before saving the rate.");
      return;
    }

    const rateValues = [
      ["Base room rate", form.base],
      ["Extra adult bed", form.adult],
      ["Child with bed", form.childBed],
      ["Child parent sharing", form.childShare],
      ["Infant sharing", form.infant],
    ] as const;
    const invalidRate = rateValues.find(
      ([, value]) =>
        value.trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0,
    );
    if (invalidRate) {
      setError(`${invalidRate[0]} must be zero or a positive amount.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveHotelRate(initial?.id ?? null, hotel.id, {
        location_id: hotel.location_id,
        category_id: categoryId,
        hotel_id: hotel.id,
        room_id: form.scope === "room" ? form.room_id : null,
        meal_plan: form.meal_plan as MealPlan,
        base_room_rate_paise: paise(form.base),
        extra_adult_bed_paise: paise(form.adult),
        child_with_bed_paise: paise(form.childBed),
        child_without_bed_paise: paise(form.childShare),
        infant_sharing_paise: paise(form.infant),
        child_pricing_policy: form.policy as "child_rates" | "adult_rate",
        child_with_bed_allowed:
          form.policy === "adult_rate" ? true : form.childBedAllowed,
        child_without_bed_allowed:
          form.policy === "adult_rate" ? false : form.childShareAllowed,
        currency: "INR",
        tax_included: true,
        notes: form.notes.trim() || null,
        status: form.status as "active" | "inactive",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The rate could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="h-4 w-4" />
            </span>
            {initial ? "Edit rate card" : "Add rate card"}
          </DialogTitle>
          <DialogDescription>
            Location pricing is inherited automatically. Create an override only
            when this hotel or room needs a different rate.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submit}
          onInvalid={(event) => {
            event.preventDefault();
            setError("Complete all required pricing fields before saving.");
          }}
          className="space-y-4"
        >
          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {form.scope === "location" && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                locationDefault
                  ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300"
              }`}
            >
              {locationDefault ? (
                <p>
                  This active location default is inherited automatically. Its
                  values are read-only here; update it from{" "}
                  <Link
                    href={`/home/hotels/pricing?locationId=${hotel.location_id}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Location Pricing
                  </Link>
                  .
                </p>
              ) : (
                <p>
                  No active location default exists for this category and meal
                  plan. Add it in{" "}
                  <Link
                    href={`/home/hotels/pricing?locationId=${hotel.location_id}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Location Pricing
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
          {form.scope !== "location" && inheritedRate && !initial && (
            <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Fields were prefilled from the active {inheritedRate.hotel_id ? "hotel override" : "location default"}. You can now change them for this override.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Scope
              <select
                className={select}
                value={form.scope}
                disabled={Boolean(initial)}
                onChange={(e) => changeScope(e.target.value)}
              >
                <option value="location">Location default</option>
                <option value="hotel" disabled={!canOverridePrice}>
                  Hotel override
                </option>
                <option value="room" disabled={!canOverridePrice}>
                  Room override
                </option>
              </select>
            </label>
            {form.scope === "room" ? (
              <label className="space-y-2 text-sm font-medium">
                Room
                <select
                  required
                  className={select}
                  value={form.room_id}
                  onChange={(e) => changeRoom(e.target.value)}
                >
                  <option value="">Select room</option>
                  {hotel.rooms.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.category.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="space-y-2 text-sm font-medium">
                Category
                <select
                  className={select}
                  value={form.category_id}
                  onChange={(e) => changeCategory(e.target.value)}
                >
                  {categories.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="space-y-2 text-sm font-medium">
              Meal plan
              <select
                className={select}
                value={form.meal_plan}
                onChange={(e) => changeMealPlan(e.target.value as MealPlan)}
              >
                <option value="EP">EP · Room only</option>
                <option value="CP">CP · Breakfast</option>
                <option value="MAP">MAP · Breakfast + one meal</option>
                <option value="AP">AP · All meals</option>
              </select>
            </label>
            {[
              ["Base room rate (₹)", "base"],
              ["Extra adult bed (₹)", "adult"],
              ["Child with bed (₹)", "childBed"],
              ["Child parent sharing (₹)", "childShare"],
              ["Infant sharing (₹)", "infant"],
            ].map(([label, key]) => (
              <label key={key} className="space-y-2 text-sm font-medium">
                {label}
                <Input
                  required
                  readOnly={readOnlyPricing}
                  aria-readonly={readOnlyPricing}
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(form[key as keyof typeof form])}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label className="space-y-2 text-sm font-medium">
              Child policy
              <select
                className={select}
                value={form.policy}
                disabled={readOnlyPricing}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    policy: e.target.value as "child_rates" | "adult_rate",
                  }))
                }
              >
                <option value="child_rates">Use child rates</option>
                <option value="adult_rate">Treat child as adult</option>
              </select>
            </label>
            {form.policy === "child_rates" && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={readOnlyPricing}
                    checked={form.childBedAllowed}
                    onChange={(e) =>
                      setForm((x) => ({
                        ...x,
                        childBedAllowed: e.target.checked,
                      }))
                    }
                  />
                  Child extra bed allowed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={readOnlyPricing}
                    checked={form.childShareAllowed}
                    onChange={(e) =>
                      setForm((x) => ({
                        ...x,
                        childShareAllowed: e.target.checked,
                      }))
                    }
                  />
                  Child parent-sharing allowed
                </label>
              </>
            )}
            <div className="space-y-3 rounded-2xl border bg-muted/15 p-4 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Adult group preview</p>
                  <p className="text-xs text-muted-foreground">
                    Per-night total using double rooms and one extra bed for odd groups.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Tax included
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {adultPricingPreview.map((item) => (
                  <div
                    key={item.pax}
                    className="rounded-xl border bg-background p-3 text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.pax} pax
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {money(Math.round(item.total * 100))}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.rooms} room{item.rooms > 1 ? "s" : ""}
                      {item.extraBeds ? " + bed" : ""}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                <span>Infant: 0–4 years</span>
                <span>Child: 5–11 years</span>
                <span>Adult: 12+ years</span>
              </div>
            </div>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Notes
              <Textarea
                value={form.notes}
                readOnly={readOnlyPricing}
                onChange={(e) =>
                  setForm((x) => ({ ...x, notes: e.target.value }))
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {form.scope === "location" ? (
              <Button type="button" onClick={onClose}>Done</Button>
            ) : (
              <Button type="submit" disabled={saving || !scopeAllowed}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save override
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
