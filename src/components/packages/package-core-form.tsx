"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Images, Loader2, MapPinned, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { VehicleSearchableSelect } from "@/components/vehicles/vehicle-searchable-select";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";
import { savePackageCore } from "@/lib/packages/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type { PackageAsset, PackageDetail, PackagePermissions, PackageReferenceData, PackageStatus } from "@/types/package";

const section="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6";
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

function Heading({icon:Icon,title,description}:{icon:React.ComponentType<{className?:string}>;title:string;description:string}){
 return <div className="flex items-start gap-3 border-b pb-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5"/></span><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{description}</p></div></div>;
}

export function PackageCoreForm({initial,refs,permissions}:{initial?:PackageDetail|null;refs:PackageReferenceData;permissions:PackagePermissions}){
 const router=useRouter();
 const [saving,setSaving]=React.useState(false),[error,setError]=React.useState<string|null>(null),[message,setMessage]=React.useState<string|null>(null),[picker,setPicker]=React.useState<"featured"|"gallery"|null>(null),[slugTouched,setSlugTouched]=React.useState(Boolean(initial)),[destinationSearch,setDestinationSearch]=React.useState("");
 const [featured,setFeatured]=React.useState<PackageAsset|null>(initial?.featured_image??null);
 const [gallery,setGallery]=React.useState<PackageAsset[]>(initial?.gallery.map(x=>x.media_asset).filter((x):x is PackageAsset=>Boolean(x))??[]);
 const [destinationIds,setDestinationIds]=React.useState<string[]>(initial?.destinations.map(x=>x.destination_id)??[]);
 const [form,setForm]=React.useState({primary_destination_id:initial?.primary_destination_id??"",start_location_id:initial?.start_location_id??"",end_location_id:initial?.end_location_id??"",name:initial?.name??"",slug:initial?.slug??"",package_code:initial?.package_code??"",short_description:initial?.short_description??"",description:initial?.description??"",duration_days:String(initial?.duration_days??7),duration_nights:String(initial?.duration_nights??6),is_featured:initial?.is_featured??false,status:initial?.status??"draft",seo_title:initial?.seo_title??"",seo_description:initial?.seo_description??"",apply_content_defaults:true});
 const set=(key:string,value:string|boolean)=>setForm(x=>({...x,[key]:value}));
 const locations=refs.locations.map(x=>({value:x.id,label:x.name,description:x.destination?.name??undefined}));
 const destinations=refs.destinations.map(x=>({value:x.id,label:x.name,description:[x.region?.name,x.region?.country?.name].filter(Boolean).join(", ")}));
 const filteredDestinations=refs.destinations.filter(x=>`${x.name} ${x.region?.name??""} ${x.region?.country?.name??""}`.toLowerCase().includes(destinationSearch.toLowerCase()));

 async function submit(event:React.FormEvent){event.preventDefault();setSaving(true);setError(null);setMessage(null);
  try{const result=await savePackageCore(initial?.id??null,{primary_destination_id:form.primary_destination_id,start_location_id:form.start_location_id||null,end_location_id:form.end_location_id||null,name:form.name,slug:form.slug,package_code:form.package_code.trim()||null,short_description:form.short_description.trim()||null,description:form.description.trim()||null,duration_days:Number(form.duration_days),duration_nights:Number(form.duration_nights),featured_image_asset_id:featured?.id??null,gallery_asset_ids:gallery.map(x=>x.id),destination_ids:destinationIds,is_featured:form.is_featured,status:form.status as PackageStatus,seo_title:form.seo_title.trim()||null,seo_description:form.seo_description.trim()||null,apply_content_defaults:form.apply_content_defaults});
   if(!result.success){setError(result.error);return;}if(!initial){router.push(`/home/packages/${result.data.id}/edit`);return;}setMessage("Package details and gallery saved successfully.");router.refresh();
  }catch(saveError){setError(getNetworkErrorMessage(saveError));}finally{setSaving(false);}
 }
 return <form onSubmit={submit} className="space-y-6" onInvalid={()=>setError("Please complete the highlighted required fields.")}>
  <section className={section}><Heading icon={MapPinned} title="Package essentials" description="Identity, duration and route anchors used throughout the itinerary."/>
   <div className="grid gap-4 sm:grid-cols-2">
    <VehicleSearchableSelect label="Primary destination" name="primary_destination_id" value={form.primary_destination_id} options={destinations} onValueChange={v=>set("primary_destination_id",v)} placeholder="Search destination" required/>
    <label className="space-y-1.5 text-sm font-medium">Package name<Input required minLength={3} maxLength={180} value={form.name} onChange={e=>{const name=e.target.value;setForm(x=>({...x,name,slug:slugTouched?x.slug:slugify(name)}));}}/></label>
    <label className="space-y-1.5 text-sm font-medium">Slug<Input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e=>{setSlugTouched(true);set("slug",slugify(e.target.value));}}/></label>
    <label className="space-y-1.5 text-sm font-medium">Package code<Input maxLength={40} placeholder="AR-TAWANG-7D" value={form.package_code} onChange={e=>set("package_code",e.target.value.toUpperCase())}/></label>
    <label className="space-y-1.5 text-sm font-medium">Days<Input required type="number" min={1} max={90} value={form.duration_days} onChange={e=>{const days=e.target.value;setForm(x=>({...x,duration_days:days,duration_nights:String(Math.max(0,Number(days)-1))}));}}/></label>
    <label className="space-y-1.5 text-sm font-medium">Nights<Input required type="number" min={0} max={90} value={form.duration_nights} onChange={e=>set("duration_nights",e.target.value)}/></label>
    <VehicleSearchableSelect label="Tour starts at" name="start_location_id" value={form.start_location_id} options={locations} onValueChange={v=>set("start_location_id",v)} placeholder="Optional start location" emptyOptionLabel="No start location"/>
    <VehicleSearchableSelect label="Tour ends at" name="end_location_id" value={form.end_location_id} options={locations} onValueChange={v=>set("end_location_id",v)} placeholder="Optional end location" emptyOptionLabel="No end location"/>
    <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Short description<Textarea maxLength={500} value={form.short_description} onChange={e=>set("short_description",e.target.value)}/><span className="block text-right text-xs text-muted-foreground">{form.short_description.length}/500</span></label>
    <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Detailed description<Textarea className="min-h-40" maxLength={30000} value={form.description} onChange={e=>set("description",e.target.value)}/></label>
   </div>
  </section>

  <section className={section}><Heading icon={Search} title="Covered destinations" description="Choose every destination included in this tour; the primary destination is always included."/>
   <Input value={destinationSearch} onChange={e=>setDestinationSearch(e.target.value)} placeholder="Search destinations..."/>
   <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredDestinations.map(item=>{const checked=item.id===form.primary_destination_id||destinationIds.includes(item.id);return <label key={item.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${checked?"border-primary/40 bg-primary/5":"hover:bg-muted/30"}`}><span><b className="block">{item.name}</b><small className="text-muted-foreground">{item.region?.name}</small></span><span className={`grid h-5 w-5 place-items-center rounded border ${checked?"border-primary bg-primary text-primary-foreground":""}`}>{checked&&<Check className="h-3.5 w-3.5"/>}</span><input type="checkbox" className="sr-only" disabled={item.id===form.primary_destination_id} checked={checked} onChange={e=>setDestinationIds(x=>e.target.checked?[...new Set([...x,item.id])]:x.filter(id=>id!==item.id))}/></label>;})}</div>
  </section>

  <section className={section}><Heading icon={Images} title="Package gallery" description="Select a cover and reusable gallery images from the Packages media folder."/>
   {!permissions.canBrowseMedia&&<p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">media.view permission is required to choose images.</p>}
   <div className="grid gap-5 lg:grid-cols-[280px_1fr]"><div className="space-y-2"><p className="text-sm font-medium">Featured image</p>{featured?.original_url?<div className="overflow-hidden rounded-xl border"><Image src={featured.original_url} alt={featured.alt_text??form.name} width={560} height={320} unoptimized className="h-40 w-full object-cover"/><div className="flex gap-2 p-2"><Button type="button" variant="outline" onClick={()=>setPicker("featured")}>Replace</Button><Button type="button" variant="ghost" onClick={()=>setFeatured(null)}>Remove</Button></div></div>:<button type="button" disabled={!permissions.canBrowseMedia} onClick={()=>setPicker("featured")} className="grid h-40 w-full place-items-center rounded-xl border border-dashed bg-muted/20 hover:border-primary/50 disabled:opacity-50"><span className="flex flex-col items-center gap-2 text-sm text-muted-foreground"><ImagePlus/>Choose cover</span></button>}</div>
    <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium">Gallery ({gallery.length})</p><Button type="button" variant="outline" disabled={!permissions.canBrowseMedia} onClick={()=>setPicker("gallery")}><ImagePlus/>Add image</Button></div>{gallery.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.map(asset=><div key={asset.id} className="group relative overflow-hidden rounded-xl border">{asset.original_url&&<Image src={asset.original_url} alt={asset.alt_text??form.name} width={300} height={180} unoptimized className="h-28 w-full object-cover"/>}<button type="button" aria-label="Remove image" onClick={()=>setGallery(x=>x.filter(a=>a.id!==asset.id))} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-background/90 text-destructive shadow"><Trash2 className="h-4 w-4"/></button></div>)}</div>:<div className="grid h-40 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">No gallery images selected.</div>}</div></div>
  </section>

  <section className={section}><Heading icon={Sparkles} title="Publishing and SEO" description="Control website visibility and search-result metadata."/>
   <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Status<select className="h-10 w-full rounded-lg border bg-background px-3" value={form.status} onChange={e=>set("status",e.target.value)}><option value="draft">Draft</option>{initial&&permissions.canPublish&&<option value="published">Published</option>}<option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
    <label className="flex items-center justify-between rounded-xl border p-4 text-sm"><span><b className="block">Featured package</b><small className="text-muted-foreground">Highlight on curated website sections.</small></span><input type="checkbox" className="h-4 w-4 accent-primary" checked={form.is_featured} onChange={e=>set("is_featured",e.target.checked)}/></label>
    <label className="space-y-1.5 text-sm font-medium sm:col-span-2">SEO title<Input maxLength={70} value={form.seo_title} onChange={e=>set("seo_title",e.target.value)}/><span className="block text-right text-xs text-muted-foreground">{form.seo_title.length}/70</span></label>
    <label className="space-y-1.5 text-sm font-medium sm:col-span-2">SEO description<Textarea maxLength={170} value={form.seo_description} onChange={e=>set("seo_description",e.target.value)}/><span className="block text-right text-xs text-muted-foreground">{form.seo_description.length}/170</span></label></div>
  </section>
  {(error||message)&&<p role="alert" className={`rounded-xl border p-3 text-sm ${error?"border-destructive/30 bg-destructive/5 text-destructive":"border-emerald-300 bg-emerald-50 text-emerald-800"}`}>{error??message}</p>}
  {!initial&&<><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={form.apply_content_defaults} onChange={e=>set("apply_content_defaults",e.target.checked)}/><span><b className="block">Add default policies and content</b><small className="mt-1 block text-muted-foreground">Recommended. Copies the current inclusions/exclusions, terms, cancellation and reschedule policy into this package as an editable snapshot.</small></span></label><div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">2</span><div><p className="font-semibold">Next: itinerary, automatic stays and activities</p><p className="mt-1 text-sm text-muted-foreground">For every day, choose an overnight location to load Value-to-Royal hotel rates automatically. Hotel, meal, vehicle and included-activity content will be generated from the itinerary.</p></div></div></div></>}
  <div className="sticky bottom-3 z-20 flex justify-end rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur"><Button type="submit" size="lg" disabled={saving}>{saving?<Loader2 className="animate-spin"/>:<Save/>}{saving?"Saving...":initial?"Save package details":"Save & add itinerary/hotels"}</Button></div>
  <MediaPickerDialog open={picker!==null} onOpenChange={open=>!open&&setPicker(null)} folder={MEDIA_FOLDERS.PACKAGES} fileNamePrefix={slugify(form.slug||form.name||"package")} altText={form.name} canUpload={permissions.canUploadMedia} onSelect={asset=>{const normalized=asset as PackageAsset;if(picker==="featured")setFeatured(normalized);else setGallery(x=>x.some(a=>a.id===normalized.id)?x:[...x,normalized]);}}/>
 </form>;
}
