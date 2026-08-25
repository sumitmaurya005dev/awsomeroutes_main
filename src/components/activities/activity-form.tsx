"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";
import { createActivity, updateActivity } from "@/lib/activities/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type { ActivityCategory, ActivityDetail, ActivityStatus } from "@/types/activity";

type SelectedAsset = { id: string; original_url: string | null; file_name: string; alt_text: string | null };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
const sectionClass = "space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6";

export function ActivityForm({ initial, categories, canBrowseMedia, canUploadMedia }: { initial?: ActivityDetail | null; categories: ActivityCategory[]; canBrowseMedia: boolean; canUploadMedia: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [pickerMode, setPickerMode] = React.useState<"featured" | "gallery" | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial));
  const [featured, setFeatured] = React.useState<SelectedAsset | null>(initial?.featured_image ?? (initial?.featured_image_asset_id ? { id: initial.featured_image_asset_id, original_url: null, file_name: "Assigned image", alt_text: null } : null));
  const [gallery, setGallery] = React.useState<SelectedAsset[]>(
    initial?.gallery.map((item) => item.media_asset ?? { id: item.media_asset_id, original_url: null, file_name: "Assigned image", alt_text: item.alt_text }) ?? [],
  );
  const [form, setForm] = React.useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    category_id: initial?.category_id ?? categories[0]?.id ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    duration_minutes: initial?.duration_minutes?.toString() ?? "",
    difficulty_level: initial?.difficulty_level ?? "",
    minimum_age: initial?.minimum_age?.toString() ?? "",
    maximum_age: initial?.maximum_age?.toString() ?? "",
    minimum_weight_kg: initial?.minimum_weight_kg?.toString() ?? "",
    maximum_weight_kg: initial?.maximum_weight_kg?.toString() ?? "",
    safety_information: initial?.safety_information ?? "",
    medical_restrictions: initial?.medical_restrictions ?? "",
    what_to_carry: initial?.what_to_carry ?? "",
    inclusions: initial?.inclusions ?? "",
    exclusions: initial?.exclusions ?? "",
    highlights: initial?.highlights ?? "",
    status: initial?.status ?? "draft",
    is_featured: initial?.is_featured ?? false,
    seo_title: initial?.seo_title ?? "",
    seo_description: initial?.seo_description ?? "",
  });

  function updateName(name: string) {
    setForm((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }));
  }

  function moveGallery(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= gallery.length) return;
    setGallery((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const values = {
      name: form.name,
      slug: form.slug,
      category_id: form.category_id,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      duration_minutes: nullableNumber(form.duration_minutes),
      difficulty_level: (form.difficulty_level || null) as "easy" | "moderate" | "challenging" | "extreme" | null,
      minimum_age: nullableNumber(form.minimum_age),
      maximum_age: nullableNumber(form.maximum_age),
      minimum_weight_kg: nullableNumber(form.minimum_weight_kg),
      maximum_weight_kg: nullableNumber(form.maximum_weight_kg),
      safety_information: form.safety_information.trim() || null,
      medical_restrictions: form.medical_restrictions.trim() || null,
      what_to_carry: form.what_to_carry.trim() || null,
      inclusions: form.inclusions.trim() || null,
      exclusions: form.exclusions.trim() || null,
      highlights: form.highlights.trim() || null,
      featured_image_asset_id: featured?.id ?? null,
      gallery_asset_ids: gallery.map((asset) => asset.id),
      status: form.status as "draft" | "active" | "temporarily_unavailable" | "inactive",
      is_featured: form.is_featured,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
    };
    try {
      const result = initial ? await updateActivity(initial.id, values) : await createActivity(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!initial) {
        router.push(`/home/activities/${result.data.id}/edit`);
        return;
      }
      setMessage("Activity details saved successfully.");
      router.refresh();
    } catch (submitError) {
      setError(getNetworkErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={sectionClass}>
        <div><h2 className="text-lg font-semibold">Basic information</h2><p className="text-sm text-muted-foreground">Public identity and general activity details.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">Activity name<Input required maxLength={120} value={form.name} onChange={(event) => updateName(event.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium">Slug<Input required maxLength={140} value={form.slug} onChange={(event) => { setSlugTouched(true); setForm({ ...form, slug: slugify(event.target.value) }); }} /></label>
          <label className="space-y-2 text-sm font-medium">Category<select required className={inputClass} value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="space-y-2 text-sm font-medium">Status<select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ActivityStatus })}><option value="draft">Draft</option><option value="active">Active</option><option value="temporarily_unavailable">Temporarily unavailable</option><option value="inactive">Inactive</option></select></label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Short description<Textarea maxLength={300} value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} /></label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Detailed description<Textarea className="min-h-36" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} />Feature this activity on the website</label>
        </div>
      </section>

      <section className={sectionClass}>
        <div><h2 className="text-lg font-semibold">Eligibility and safety</h2><p className="text-sm text-muted-foreground">Optional restrictions support safaris as well as future adventure activities.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm font-medium">Duration (minutes)<Input type="number" min="1" value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} /></label>
          <label className="space-y-2 text-sm font-medium">Difficulty<select className={inputClass} value={form.difficulty_level} onChange={(event) => setForm({ ...form, difficulty_level: event.target.value })}><option value="">Not applicable</option><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option><option value="extreme">Extreme</option></select></label>
          <label className="space-y-2 text-sm font-medium">Minimum age<Input type="number" min="0" max="120" value={form.minimum_age} onChange={(event) => setForm({ ...form, minimum_age: event.target.value })} /></label>
          <label className="space-y-2 text-sm font-medium">Maximum age<Input type="number" min="0" max="120" value={form.maximum_age} onChange={(event) => setForm({ ...form, maximum_age: event.target.value })} /></label>
          <label className="space-y-2 text-sm font-medium">Minimum weight (kg)<Input type="number" min="0" step="0.1" value={form.minimum_weight_kg} onChange={(event) => setForm({ ...form, minimum_weight_kg: event.target.value })} /></label>
          <label className="space-y-2 text-sm font-medium">Maximum weight (kg)<Input type="number" min="0" step="0.1" value={form.maximum_weight_kg} onChange={(event) => setForm({ ...form, maximum_weight_kg: event.target.value })} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Safety information<Textarea value={form.safety_information} onChange={(event) => setForm({ ...form, safety_information: event.target.value })} /></label><label className="space-y-2 text-sm font-medium">Medical restrictions<Textarea value={form.medical_restrictions} onChange={(event) => setForm({ ...form, medical_restrictions: event.target.value })} /></label></div>
      </section>

      <section className={sectionClass}>
        <div><h2 className="text-lg font-semibold">Website content</h2><p className="text-sm text-muted-foreground">Use one item per line for readable public content.</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Highlights<Textarea value={form.highlights} onChange={(event) => setForm({ ...form, highlights: event.target.value })} /></label><label className="space-y-2 text-sm font-medium">What to carry<Textarea value={form.what_to_carry} onChange={(event) => setForm({ ...form, what_to_carry: event.target.value })} /></label><label className="space-y-2 text-sm font-medium">Inclusions<Textarea value={form.inclusions} onChange={(event) => setForm({ ...form, inclusions: event.target.value })} /></label><label className="space-y-2 text-sm font-medium">Exclusions<Textarea value={form.exclusions} onChange={(event) => setForm({ ...form, exclusions: event.target.value })} /></label></div>
      </section>

      <section className={sectionClass}>
        <div><h2 className="text-lg font-semibold">Images</h2><p className="text-sm text-muted-foreground">Select reusable Media Library images. New uploads are saved in the Activities folder.</p></div>
        {!canBrowseMedia && <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">You need the media.view permission to select activity images.</p>}
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3"><p className="text-sm font-medium">Featured image</p>{featured ? <div className="overflow-hidden rounded-xl border">{featured.original_url ? <Image src={featured.original_url} alt={featured.alt_text ?? form.name} width={560} height={320} unoptimized className="h-40 w-full object-cover" /> : <div className="grid h-40 place-items-center bg-muted px-4 text-center text-sm text-muted-foreground">Assigned image is not visible with your media permission.</div>}<div className="flex gap-2 p-2"><Button type="button" size="sm" variant="outline" onClick={() => setPickerMode("featured")} disabled={!canBrowseMedia}>Replace</Button><Button type="button" size="sm" variant="ghost" onClick={() => setFeatured(null)}>Remove</Button></div></div> : <button type="button" disabled={!canBrowseMedia} onClick={() => setPickerMode("featured")} className="grid h-40 w-full place-items-center rounded-xl border border-dashed text-sm text-muted-foreground disabled:opacity-50"><span className="flex flex-col items-center gap-2"><ImagePlus className="h-6 w-6" />Choose featured image</span></button>}</div>
          <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">Gallery ({gallery.length}/30)</p><Button type="button" size="sm" variant="outline" onClick={() => setPickerMode("gallery")} disabled={!canBrowseMedia || gallery.length >= 30}><ImagePlus className="mr-2 h-4 w-4" />Add image</Button></div>{gallery.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.map((asset, index) => <div key={asset.id} className="overflow-hidden rounded-xl border">{asset.original_url ? <Image src={asset.original_url} alt={asset.alt_text ?? asset.file_name} width={300} height={180} unoptimized className="h-24 w-full object-cover" /> : <div className="grid h-24 place-items-center bg-muted px-2 text-center text-xs text-muted-foreground">Assigned image</div>}<div className="flex justify-between p-1"><div><button type="button" aria-label="Move image left" onClick={() => moveGallery(index, -1)} disabled={index === 0} className="p-1 disabled:opacity-30"><ChevronUp className="h-4 w-4 -rotate-90" /></button><button type="button" aria-label="Move image right" onClick={() => moveGallery(index, 1)} disabled={index === gallery.length - 1} className="p-1 disabled:opacity-30"><ChevronDown className="h-4 w-4 -rotate-90" /></button></div><button type="button" aria-label="Remove image" onClick={() => setGallery((current) => current.filter((item) => item.id !== asset.id))} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <div className="grid h-40 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">No gallery images selected.</div>}</div>
        </div>
      </section>

      <section className={sectionClass}>
        <div><h2 className="text-lg font-semibold">SEO</h2><p className="text-sm text-muted-foreground">Optional search-result title and description.</p></div>
        <div className="grid gap-4"><label className="space-y-2 text-sm font-medium">SEO title ({form.seo_title.length}/70)<Input maxLength={70} value={form.seo_title} onChange={(event) => setForm({ ...form, seo_title: event.target.value })} /></label><label className="space-y-2 text-sm font-medium">Meta description ({form.seo_description.length}/170)<Textarea maxLength={170} value={form.seo_description} onChange={(event) => setForm({ ...form, seo_description: event.target.value })} /></label></div>
      </section>

      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{initial ? "Save Activity" : "Create Activity"}</Button></div>

      <MediaPickerDialog open={pickerMode !== null} onOpenChange={(open) => !open && setPickerMode(null)} folder={MEDIA_FOLDERS.ACTIVITIES} fileNamePrefix={slugify(form.slug || form.name || "activity")} altText={form.name} canUpload={canUploadMedia} onSelect={(asset) => { const selected: SelectedAsset = { id: asset.id, original_url: asset.original_url, file_name: asset.file_name, alt_text: asset.alt_text }; if (pickerMode === "featured") setFeatured(selected); else if (pickerMode === "gallery") setGallery((current) => current.some((item) => item.id === selected.id) ? current : [...current, selected]); }} />
    </form>
  );
}
