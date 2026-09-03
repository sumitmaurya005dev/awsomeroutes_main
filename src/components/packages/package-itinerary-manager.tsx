"use client";

import * as React from "react";
import { Activity, AlertTriangle, BedDouble, ChevronDown, IndianRupee, Loader2, Pencil, Plus, Route, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VehicleSearchableSelect } from "@/components/vehicles/vehicle-searchable-select";
import { deletePackageChild, savePackageActivity, savePackageDay, savePackageHotel } from "@/lib/packages/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import { calculateAdultRoomPrice } from "@/lib/hotels/pricing";
import { formatPackageMoney, resolvePackageHotelRate, resolvePackageLocationHotelRate } from "@/lib/packages/pricing";
import type { PackageDayActivity, PackageDayHotel, PackageDetail, PackageItineraryDay, PackageReferenceData } from "@/types/package";

type Editor = {kind:"day";value:PackageItineraryDay|null}|{kind:"activity";day:PackageItineraryDay;value:PackageDayActivity|null}|{kind:"hotel";day:PackageItineraryDay;value:PackageDayHotel|null}|null;
const select="h-10 w-full rounded-lg border bg-background px-3 text-sm";
const emptyToNull=(v:string)=>v||null;

export function PackageItineraryManager({pkg,refs,canEdit}:{pkg:PackageDetail;refs:PackageReferenceData;canEdit:boolean}){
 const [editor,setEditor]=React.useState<Editor>(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState<string|null>(null),[openDays,setOpenDays]=React.useState<string[]>(pkg.itinerary.map(x=>x.id));
 const locations=refs.locations.map(x=>({value:x.id,label:x.name,description:x.destination?.name??undefined}));
 function showEditor(next:Exclude<Editor,null>,dayId?:string){
  setError(null);
  if(dayId)setOpenDays(current=>current.includes(dayId)?current:[...current,dayId]);
  setEditor(next);
 }
 async function remove(kind:"day"|"activity"|"hotel",id:string){if(!confirm("Delete this item? This cannot be undone."))return;setBusy(true);setError(null);try{const result=await deletePackageChild(kind,id,pkg.id);if(!result.success)setError(result.error);}catch(e){setError(getNetworkErrorMessage(e));}finally{setBusy(false);}}
 return <section id="package-itinerary-hotels" className="scroll-mt-24 space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
  <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 font-semibold"><Route className="h-5 w-5 text-primary"/>Day-wise itinerary</h2><p className="mt-1 text-sm text-muted-foreground">Expandable website itinerary with route, meals, activities and category-wise stays.</p></div>{canEdit&&<Button type="button" aria-expanded={editor?.kind==="day"&&!editor.value} onClick={()=>showEditor({kind:"day",value:null})}><Plus/>Add day</Button>}</div>
  {error&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
   <div className="space-y-3">{pkg.itinerary.length?pkg.itinerary.map(day=>{const open=openDays.includes(day.id);const dayEditor=editor?.kind==="day"&&editor.value?.id===day.id;const activityEditor=editor?.kind==="activity"&&editor.day.id===day.id;const hotelEditor=editor?.kind==="hotel"&&editor.day.id===day.id;const active=dayEditor||activityEditor||hotelEditor;return <React.Fragment key={day.id}><article className={`overflow-hidden rounded-xl border transition-colors ${active?"border-primary/50 ring-2 ring-primary/10":""}`}>
   <button type="button" onClick={()=>setOpenDays(x=>open?x.filter(id=>id!==day.id):[...x,day.id])} className="flex w-full items-center gap-3 bg-muted/25 p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{day.day_number}</span><span className="min-w-0 flex-1"><b className="block truncate">{day.title}</b><small className="flex flex-wrap gap-x-3 text-muted-foreground">{day.distance_km!=null&&<span>{day.distance_km} km</span>}{day.travel_minutes!=null&&<span>{Math.floor(day.travel_minutes/60)}h {day.travel_minutes%60}m</span>}<span>{day.activities.length} activities</span><span>{day.hotels.length} hotel options</span></small></span><ChevronDown className={`h-5 w-5 transition ${open?"rotate-180":""}`}/></button>
   {open&&<div className="space-y-5 p-4 sm:p-5"><div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-lg bg-muted/30 p-3"><small className="text-muted-foreground">From</small><p className="font-medium">{day.start_location?.name??"Not set"}</p></div><div className="rounded-lg bg-muted/30 p-3"><small className="text-muted-foreground">To</small><p className="font-medium">{day.end_location?.name??"Not set"}</p></div><div className="rounded-lg bg-muted/30 p-3"><small className="text-muted-foreground">Overnight</small><p className="font-medium">{day.overnight_location?.name??"No overnight"}</p></div></div>
    {day.summary&&<p className="text-sm text-muted-foreground">{day.summary}</p>}{day.description&&<p className="whitespace-pre-line text-sm">{day.description}</p>}
    <div className="flex flex-wrap gap-2 text-xs">{day.vehicle_required&&<span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Vehicle included</span>}{day.breakfast_included&&<span className="rounded-full bg-muted px-2.5 py-1">Breakfast</span>}{day.lunch_included&&<span className="rounded-full bg-muted px-2.5 py-1">Lunch</span>}{day.dinner_included&&<span className="rounded-full bg-muted px-2.5 py-1">Dinner</span>}</div>
    <LocationHotelPricingOverview locationId={day.overnight_location_id} refs={refs} selectedHotels={day.hotels}/>
    <div className="grid gap-4 lg:grid-cols-2"><MiniList title="Activities" icon={Activity} addLabel="Add activity" canEdit={canEdit} active={activityEditor} onAdd={()=>showEditor({kind:"activity",day,value:null},day.id)}>{day.activities.map(item=><MiniRow key={item.id} title={item.offering?.activity?.name??"Activity"} description={[item.variant?.name,item.is_optional?"Optional":"Included",`Qty ${item.quantity}`].filter(Boolean).join(" · ")} canEdit={canEdit} busy={busy} active={editor?.kind==="activity"&&editor.value?.id===item.id} onEdit={()=>showEditor({kind:"activity",day,value:item},day.id)} onDelete={()=>remove("activity",item.id)}/>)}</MiniList>
     <MiniList title="Custom hotel/room overrides" icon={BedDouble} addLabel="Add override" canEdit={canEdit} active={hotelEditor} onAdd={()=>showEditor({kind:"hotel",day,value:null},day.id)}>{day.hotels.map(item=><MiniRow key={item.id} title={`${item.category?.name??"Category"}: ${item.hotel?.name??"Hotel"}`} description={hotelRowDescription(item,day,refs)} canEdit={canEdit} busy={busy} active={editor?.kind==="hotel"&&editor.value?.id===item.id} onEdit={()=>showEditor({kind:"hotel",day,value:item},day.id)} onDelete={()=>remove("hotel",item.id)}/>)}</MiniList></div>
    {canEdit&&<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" aria-expanded={dayEditor} onClick={()=>showEditor({kind:"day",value:day},day.id)}><Pencil/>Edit day</Button><Button type="button" variant="destructive" disabled={busy} onClick={()=>remove("day",day.id)}><Trash2/>Delete day</Button></div>}
   </div>}</article>
   {dayEditor&&<DayEditor key={`day-${day.id}`} pkg={pkg} value={day} locations={locations} refs={refs} busy={busy} setBusy={setBusy} onClose={()=>setEditor(null)} onError={setError}/>} 
   {activityEditor&&editor?.kind==="activity"&&<ActivityEditor key={`activity-${day.id}-${editor.value?.id??"new"}`} pkg={pkg} day={day} value={editor.value} refs={refs} busy={busy} setBusy={setBusy} onClose={()=>setEditor(null)} onError={setError}/>} 
   {hotelEditor&&editor?.kind==="hotel"&&<HotelEditor key={`hotel-${day.id}-${editor.value?.id??"new"}`} pkg={pkg} day={day} value={editor.value} refs={refs} busy={busy} setBusy={setBusy} onClose={()=>setEditor(null)} onError={setError}/>} 
   </React.Fragment>;}):<div className="rounded-xl border border-dashed bg-muted/10 p-5 text-center sm:p-8"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><BedDouble className="h-6 w-6"/></div><h3 className="mt-3 font-semibold">Start with Day 1</h3><p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">Choose the overnight stay location and its category-wise hotel rates will populate automatically. You can add included activities in the same form.</p>{canEdit&&<Button className="mt-4" type="button" aria-expanded={editor?.kind==="day"&&!editor.value} onClick={()=>showEditor({kind:"day",value:null})}><Plus/>Add Day 1</Button>}</div>}</div>
   {editor?.kind==="day"&&!editor.value&&<DayEditor key="day-new" pkg={pkg} value={null} locations={locations} refs={refs} busy={busy} setBusy={setBusy} onClose={()=>setEditor(null)} onError={setError}/>} 
 </section>;
}

function hotelRateSourceLabel(
  source: "room_override" | "hotel_override" | "location_default",
) {
  if (source === "room_override") return "Room override";
  if (source === "hotel_override") return "Hotel override";
  return "Location default";
}

function hotelsForOvernight(
  refs: PackageReferenceData,
  overnightLocationId: string | null,
) {
  if (!overnightLocationId) return [];
  const overnight = refs.locations.find((item) => item.id === overnightLocationId);
  const destinationId = overnight?.destination?.id;
  return refs.hotels
    .filter((hotel) => {
      if (hotel.location_id === overnightLocationId) return true;
      const hotelLocation = refs.locations.find((item) => item.id === hotel.location_id);
      return Boolean(destinationId && hotelLocation?.destination?.id === destinationId);
    })
    .sort((left, right) => {
      const leftExact = left.location_id === overnightLocationId ? 0 : 1;
      const rightExact = right.location_id === overnightLocationId ? 0 : 1;
      return leftExact - rightExact || left.name.localeCompare(right.name);
    });
}

function hotelLocationLabel(refs: PackageReferenceData, locationId: string) {
  const location = refs.locations.find((item) => item.id === locationId);
  return [location?.name, location?.destination?.name].filter(Boolean).join(" · ");
}

function LocationHotelPricingOverview({
  locationId,
  refs,
  selectedHotels = [],
}: {
  locationId: string | null;
  refs: PackageReferenceData;
  selectedHotels?: PackageDayHotel[];
}) {
  if (!locationId) {
    return <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Select an overnight location to load category-wise hotel pricing.</div>;
  }
  const location = refs.locations.find((item) => item.id === locationId);
  const exactHotels = refs.hotels.filter((hotel) => hotel.location_id === locationId);
  return <div className="overflow-hidden rounded-xl border">
    <div className="flex flex-col gap-1 border-b bg-primary/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div><b className="flex items-center gap-2 text-sm"><BedDouble className="h-4 w-4 text-primary"/>Automatic hotel pricing</b><p className="mt-0.5 text-xs text-muted-foreground">{location?.name??"Overnight location"} · location-default CP rates · one night</p></div>
      <span className="text-xs text-muted-foreground">{exactHotels.length} hotel{exactHotels.length===1?"":"s"} mapped</span>
    </div>
    <div className="divide-y">{refs.hotel_categories.map((category)=>{
      const rate=resolvePackageLocationHotelRate(refs.hotel_rates,{locationId,categoryId:category.id,mealPlan:"CP"});
      const manual=selectedHotels.find((item)=>item.hotel_category_id===category.id&&item.is_primary);
      const options=exactHotels.flatMap((hotel)=>{
        const rooms=hotel.rooms.filter((room)=>room.status==="active"&&room.category_id===category.id);
        return rooms.length?rooms.map((room)=>`${hotel.name} · ${room.name}`):[];
      });
      return <div key={category.id} className="grid gap-2 p-3 text-sm lg:grid-cols-[140px_180px_1fr] lg:items-center">
        <div><b>{category.name}</b>{manual&&<span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">custom override</span>}</div>
        <div>{rate?<><b>{formatPackageMoney(rate.base_room_rate_paise)}</b><span className="block text-[10px] text-muted-foreground">room/night · extra bed {formatPackageMoney(rate.extra_adult_bed_paise)}</span></>:<span className="text-xs text-amber-700 dark:text-amber-300">CP rate missing</span>}</div>
        <p className="text-xs text-muted-foreground">{options.length?options.join(" · "):"No active hotel room variant mapped to this category."}</p>
      </div>;
    })}</div>
  </div>;
}

function hotelRowDescription(
  item: PackageDayHotel,
  day: PackageItineraryDay,
  refs: PackageReferenceData,
) {
  const hotel = refs.hotels.find((option) => option.id === item.hotel_id);
  const resolved = resolvePackageHotelRate(refs.hotel_rates, {
    locationId: hotel?.location_id ?? day.overnight_location_id,
    categoryId: item.hotel_category_id,
    hotelId: item.hotel_id,
    roomId: item.hotel_room_id,
    mealPlan: item.meal_plan,
  });
  return [
    item.room?.name,
    item.meal_plan,
    item.is_primary ? "Primary" : "Alternative",
    hotel ? hotelLocationLabel(refs, hotel.location_id) : null,
    resolved
      ? `${hotelRateSourceLabel(resolved.source)} · ${formatPackageMoney(resolved.rate.base_room_rate_paise)}/room/night`
      : "Pricing missing",
  ]
    .filter(Boolean)
    .join(" · ");
}

function MiniList({title,icon:Icon,addLabel,canEdit,active=false,onAdd,children}:{title:string;icon:React.ComponentType<{className?:string}>;addLabel:string;canEdit:boolean;active?:boolean;onAdd:()=>void;children:React.ReactNode}){return <div className={`overflow-hidden rounded-xl border transition-colors ${active?"border-primary/50 bg-primary/[0.025] ring-2 ring-primary/10":""}`}><div className="flex items-center justify-between border-b bg-muted/20 p-3"><b className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-primary"/>{title}</b>{canEdit&&<Button size="sm" variant={active?"secondary":"ghost"} type="button" aria-expanded={active} onClick={onAdd}><Plus/>{addLabel}</Button>}</div><div className="divide-y">{React.Children.count(children)?children:<p className="p-4 text-sm text-muted-foreground">Nothing selected.</p>}</div></div>}
function MiniRow({title,description,canEdit,busy,active=false,onEdit,onDelete}:{title:string;description:string;canEdit:boolean;busy:boolean;active?:boolean;onEdit:()=>void;onDelete:()=>void}){return <div className={`flex items-center gap-3 p-3 transition-colors ${active?"bg-primary/[0.07]":""}`}><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="truncate text-xs text-muted-foreground">{description}</p></div>{canEdit&&<><Button type="button" size="icon-sm" variant={active?"secondary":"ghost"} aria-label="Edit" aria-expanded={active} onClick={onEdit}><Pencil/></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Delete" disabled={busy} onClick={onDelete}><Trash2 className="text-destructive"/></Button></>}</div>}

function EditorShell({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const containerRef=React.useRef<HTMLDivElement>(null);
 const titleId=React.useId();
 React.useEffect(()=>{
  const frame=window.requestAnimationFrame(()=>{
   const container=containerRef.current;
   if(!container)return;
   const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   container.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"start"});
   const target=container.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([aria-disabled="true"])');
   (target??container).focus({preventScroll:true});
  });
  return()=>window.cancelAnimationFrame(frame);
 },[]);
 return <div ref={containerRef} role="region" aria-labelledby={titleId} tabIndex={-1} className="scroll-mt-28 rounded-xl border-2 border-primary/50 bg-primary/[0.04] p-4 shadow-lg shadow-primary/10 ring-4 ring-primary/10 outline-none sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary"/><h3 id={titleId} className="font-semibold">{title}</h3><span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">Open editor</span></div><Button type="button" variant="ghost" data-editor-cancel onClick={onClose}>Cancel</Button></div>{children}</div>;
}

type DraftDayActivity={key:string;offeringId:string;variantId:string;quantity:string;optional:boolean;notes:string};

function DayEditor({pkg,value,locations,refs,busy,setBusy,onClose,onError}:{pkg:PackageDetail;value:PackageItineraryDay|null;locations:Array<{value:string;label:string;description?:string}>;refs:PackageReferenceData;busy:boolean;setBusy:(v:boolean)=>void;onClose:()=>void;onError:(v:string|null)=>void}){
 const [form,setForm]=React.useState({day_number:String(value?.day_number??Math.min(pkg.itinerary.length+1,pkg.duration_days)),title:value?.title??"",summary:value?.summary??"",description:value?.description??"",start_location_id:value?.start_location_id??"",end_location_id:value?.end_location_id??"",overnight_location_id:value?.overnight_location_id??"",distance_km:value?.distance_km?.toString()??"",travel_minutes:value?.travel_minutes?.toString()??"",vehicle_required:value?.vehicle_required??true,breakfast_included:value?.breakfast_included??true,lunch_included:value?.lunch_included??false,dinner_included:value?.dinner_included??false,notes:value?.notes??""});
 const [savedDayId,setSavedDayId]=React.useState(value?.id??"");
 const [savedHotel,setSavedHotel]=React.useState(false);
 const [savedActivityKeys,setSavedActivityKeys]=React.useState<string[]>([]);
 const [addHotel,setAddHotel]=React.useState(false);
 const [categoryId,setCategoryId]=React.useState("");
 const [hotelId,setHotelId]=React.useState("");
 const [roomId,setRoomId]=React.useState("");
 const [mealPlan,setMealPlan]=React.useState<PackageDayHotel["meal_plan"]>("CP");
 const [primary,setPrimary]=React.useState(true);
 const [hotelNotes,setHotelNotes]=React.useState("");
 const [draftActivities,setDraftActivities]=React.useState<DraftDayActivity[]>([]);
 const set=(k:string,v:string|boolean)=>setForm(x=>({...x,[k]:v}));
 const hotels=hotelsForOvernight(refs,form.overnight_location_id||null);
 const hotel=refs.hotels.find(x=>x.id===hotelId);
 const rooms=(hotel?.rooms??[]).filter(x=>x.status==="active"&&(!categoryId||x.category_id===categoryId));
 const pricingLocationId=hotel?.location_id??(form.overnight_location_id||null);
 const resolved=resolvePackageHotelRate(refs.hotel_rates,{locationId:pricingLocationId,categoryId,hotelId,roomId:roomId||null,mealPlan});
 const hotelOptions=hotels.map(option=>{const rate=resolvePackageHotelRate(refs.hotel_rates,{locationId:option.location_id,categoryId,hotelId:option.id,roomId:null,mealPlan});const scope=hotelLocationLabel(refs,option.location_id);return {value:option.id,label:option.name,description:[scope,categoryId?(rate?`${hotelRateSourceLabel(rate.source)} · ${formatPackageMoney(rate.rate.base_room_rate_paise)}/room/night`:"No matching active rate"):"Choose a category to preview pricing"].filter(Boolean).join(" · ")};});
 const roomOptions=rooms.map(option=>{const rate=resolvePackageHotelRate(refs.hotel_rates,{locationId:pricingLocationId,categoryId,hotelId,roomId:option.id,mealPlan});return {value:option.id,label:option.name,description:rate?`${hotelRateSourceLabel(rate.source)} · ${formatPackageMoney(rate.rate.base_room_rate_paise)}/room/night`:"No matching active rate"};});
 const previews=resolved?[2,3,4,5,6].map(pax=>({pax,...calculateAdultRoomPrice(pax,1,resolved.rate)})):[];
 const availableActivities=refs.activity_offerings;
 const updateActivity=(key:string,patch:Partial<DraftDayActivity>)=>setDraftActivities(items=>items.map(item=>item.key===key?{...item,...patch}:item));
 const addActivity=()=>setDraftActivities(items=>[...items,{key:crypto.randomUUID(),offeringId:"",variantId:"",quantity:"1",optional:false,notes:""}]);

 async function submit(e:React.FormEvent){
  e.preventDefault();onError(null);
  if(addHotel&&!form.overnight_location_id){onError("Select an overnight location to use a custom hotel override.");return;}
  if(addHotel&&(!categoryId||!hotelId)){onError("Select a category and hotel for the custom override.");return;}
  if(addHotel&&!resolved){onError("No active rate matches the custom hotel selection.");return;}
  if(draftActivities.some(item=>!item.offeringId)){onError("Select an offering for every activity row or remove the incomplete row.");return;}
  setBusy(true);
  try{
   const result=await savePackageDay(savedDayId||null,{package_id:pkg.id,day_number:Number(form.day_number),title:form.title,summary:form.summary.trim()||null,description:form.description.trim()||null,start_location_id:emptyToNull(form.start_location_id),end_location_id:emptyToNull(form.end_location_id),overnight_location_id:emptyToNull(form.overnight_location_id),distance_km:form.distance_km?Number(form.distance_km):null,travel_minutes:form.travel_minutes?Number(form.travel_minutes):null,vehicle_required:form.vehicle_required,breakfast_included:form.breakfast_included,lunch_included:form.lunch_included,dinner_included:form.dinner_included,notes:form.notes.trim()||null});
   if(!result.success){onError(result.error);return;}
   setSavedDayId(result.data.id);
   if(addHotel&&!savedHotel){
    const hotelResult=await savePackageHotel(null,pkg.id,{itinerary_day_id:result.data.id,hotel_category_id:categoryId,hotel_id:hotelId,hotel_room_id:roomId||null,meal_plan:mealPlan,is_primary:primary,notes:hotelNotes.trim()||null,display_order:0});
    if(!hotelResult.success){onError(`Day saved, but hotel override was not added: ${hotelResult.error}`);return;}
    setSavedHotel(true);
   }
   for(const [index,activity] of draftActivities.entries()){
    if(savedActivityKeys.includes(activity.key))continue;
    const activityResult=await savePackageActivity(null,pkg.id,{itinerary_day_id:result.data.id,activity_offering_id:activity.offeringId,activity_variant_id:activity.variantId||null,quantity:Number(activity.quantity),is_optional:activity.optional,notes:activity.notes.trim()||null,display_order:index});
    if(!activityResult.success){onError(`Day saved, but an activity was not added: ${activityResult.error}`);return;}
    setSavedActivityKeys(keys=>[...keys,activity.key]);
   }
   onClose();
  }catch(err){onError(getNetworkErrorMessage(err));}finally{setBusy(false);}
 }

 return <EditorShell title={value?`Edit Day ${value.day_number}`:"Add itinerary day"} onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
  <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">1 · Route and itinerary</p></div>
  <label className="space-y-1 text-sm font-medium">Day number<Input required type="number" min={1} max={pkg.duration_days} value={form.day_number} onChange={e=>set("day_number",e.target.value)}/></label>
  <label className="space-y-1 text-sm font-medium">Title<Input required minLength={2} maxLength={180} value={form.title} onChange={e=>set("title",e.target.value)}/></label>
  <VehicleSearchableSelect label="From" name="start" value={form.start_location_id} options={locations} onValueChange={v=>set("start_location_id",v)} placeholder="Optional" emptyOptionLabel="Not set"/>
  <VehicleSearchableSelect label="To" name="end" value={form.end_location_id} options={locations} onValueChange={v=>set("end_location_id",v)} placeholder="Optional" emptyOptionLabel="Not set"/>
  <VehicleSearchableSelect label="Overnight stay location" name="overnight" value={form.overnight_location_id} options={locations} onValueChange={v=>{set("overnight_location_id",v);setHotelId("");setRoomId("");}} placeholder="No overnight stay" emptyOptionLabel="No overnight stay"/>
  <label className="space-y-1 text-sm font-medium">Distance (km)<Input type="number" min={0} step="0.1" value={form.distance_km} onChange={e=>set("distance_km",e.target.value)}/></label>
  <label className="space-y-1 text-sm font-medium">Travel time (minutes)<Input type="number" min={0} value={form.travel_minutes} onChange={e=>set("travel_minutes",e.target.value)}/></label>
  <label className="space-y-1 text-sm font-medium sm:col-span-2">Summary<Textarea maxLength={500} value={form.summary} onChange={e=>set("summary",e.target.value)}/></label>
  <label className="space-y-1 text-sm font-medium sm:col-span-2">Detailed itinerary<Textarea className="min-h-32" value={form.description} onChange={e=>set("description",e.target.value)}/></label>
  <div className="flex flex-wrap gap-4 sm:col-span-2">{[["vehicle_required","Vehicle required"],["breakfast_included","Breakfast"],["lunch_included","Lunch"],["dinner_included","Dinner"]].map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form[key as keyof typeof form])} onChange={e=>set(key,e.target.checked)}/>{label}</label>)}</div>

  <div className="space-y-3 rounded-xl border bg-background p-4 sm:col-span-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">2 · Automatic hotel pricing</p><p className="mt-1 text-sm text-muted-foreground">Selecting an overnight location automatically adds its CP location rate for every package category. Day 2, Day 3 and later stays are added cumulatively.</p></div><LocationHotelPricingOverview locationId={form.overnight_location_id||null} refs={refs}/></div>

  {!value&&<div className="space-y-4 rounded-xl border bg-background p-4 sm:col-span-2">
   <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={addHotel} onChange={e=>setAddHotel(e.target.checked)}/><span><b className="flex items-center gap-2 text-sm"><BedDouble className="h-4 w-4 text-primary"/>Customize a hotel/room for this day</b><small className="mt-1 block text-muted-foreground">Optional. Leave this off to use automatic location-default pricing.</small></span></label>
   {addHotel&&<div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
    <VehicleSearchableSelect label="Package category" name="new_day_hotel_category" value={categoryId} options={refs.hotel_categories.map(x=>({value:x.id,label:x.name}))} onValueChange={v=>{setCategoryId(v);setHotelId("");setRoomId("");}} placeholder="Choose category" required/>
    <VehicleSearchableSelect label="Hotel" name="new_day_hotel" value={hotelId} options={hotelOptions} onValueChange={v=>{setHotelId(v);setRoomId("");}} placeholder={form.overnight_location_id?"Search hotels in this destination":"Set overnight location first"} required/>
    <VehicleSearchableSelect label="Room" name="new_day_room" value={roomId} options={roomOptions} onValueChange={setRoomId} placeholder="Use hotel/category rate" emptyOptionLabel="No specific room"/>
    <label className="space-y-1 text-sm font-medium">Meal plan<select className={select} value={mealPlan} onChange={e=>{setMealPlan(e.target.value as PackageDayHotel["meal_plan"]);setRoomId("");}}><option value="EP">EP · Room only</option><option value="CP">CP · Breakfast</option><option value="MAP">MAP · Breakfast + one meal</option><option value="AP">AP · All meals</option></select></label>
    <div className={`rounded-xl border p-4 sm:col-span-2 ${resolved?"border-emerald-500/30 bg-emerald-500/5":"border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>{resolved?<><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><IndianRupee className="h-4 w-4 text-primary"/>Custom effective pricing</p><p className="mt-1 text-xs text-muted-foreground">{hotel&&`${hotelLocationLabel(refs,hotel.location_id)} · `}{hotelRateSourceLabel(resolved.source)} · {mealPlan}</p></div><div className="text-right"><p className="text-lg font-bold">{formatPackageMoney(resolved.rate.base_room_rate_paise)}</p><p className="text-xs text-muted-foreground">per room / night</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{previews.map(item=><div key={item.pax} className="rounded-lg border bg-background p-2.5 text-center"><p className="text-[11px] text-muted-foreground">{item.pax} PAX</p><p className="text-sm font-semibold">{formatPackageMoney(item.totalPaise)}</p><p className="text-[10px] text-muted-foreground">{item.rooms} room{item.rooms>1?"s":""}{item.extraBeds?" + bed":""}</p></div>)}</div></>:<div className="flex gap-2 text-sm text-amber-900 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>Select category and hotel to preview a custom override.</span></div>}</div>
    <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={primary} onChange={e=>setPrimary(e.target.checked)}/>Primary override for this category</label>
    <label className="space-y-1 text-sm font-medium sm:col-span-2">Hotel notes<Textarea value={hotelNotes} onChange={e=>setHotelNotes(e.target.value)}/></label>
   </div>}
  </div>}

  {!value&&<div className="space-y-4 rounded-xl border bg-background p-4 sm:col-span-2"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">3 · Activities and pricing</p><p className="mt-1 text-sm text-muted-foreground">Included activities are added to every category in the package price table. Optional activities remain excluded.</p></div><Button type="button" variant="outline" onClick={addActivity}><Plus/>Add activity</Button></div><div className="space-y-3">{draftActivities.map((activity,index)=>{const offering=refs.activity_offerings.find(item=>item.id===activity.offeringId);return <div key={activity.key} className="grid gap-3 rounded-xl border bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_100px_auto]"><VehicleSearchableSelect label={`Activity ${index+1}`} name={`new_day_activity_${activity.key}`} value={activity.offeringId} options={availableActivities.map(item=>({value:item.id,label:item.activity?.name??"Activity",description:[item.location?.name,item.pricing_model.replaceAll("_"," ")].filter(Boolean).join(" · ")}))} onValueChange={offeringId=>updateActivity(activity.key,{offeringId,variantId:""})} placeholder="Search activity" required/><VehicleSearchableSelect label="Variant" name={`new_day_variant_${activity.key}`} value={activity.variantId} options={(offering?.variants??[]).filter(item=>item.status==="active").map(item=>({value:item.id,label:item.name}))} onValueChange={variantId=>updateActivity(activity.key,{variantId})} placeholder="Base offering" emptyOptionLabel="Base offering"/><label className="space-y-1 text-sm font-medium">Quantity<Input required type="number" min={1} max={100} value={activity.quantity} onChange={e=>updateActivity(activity.key,{quantity:e.target.value})}/></label><Button type="button" size="icon-sm" variant="ghost" className="self-end text-destructive" aria-label={`Remove activity ${index+1}`} onClick={()=>setDraftActivities(items=>items.filter(item=>item.key!==activity.key))}><Trash2/></Button><label className="flex items-center gap-2 rounded-lg border p-3 text-sm sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={activity.optional} onChange={e=>updateActivity(activity.key,{optional:e.target.checked})}/>Optional activity — do not include in base package price</label></div>;})}{!draftActivities.length&&<p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No activities selected for this day.</p>}</div></div>}

  {value&&<p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground sm:col-span-2">Existing activities and custom hotel overrides are managed from this day&apos;s cards after saving route changes.</p>}
  <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={busy||Boolean(addHotel&&!resolved)||draftActivities.some(item=>!item.offeringId)}>{busy?<Loader2 className="animate-spin"/>:<Save/>}{!value&&draftActivities.length?"Save day & activities":"Save day"}</Button></div>
 </form></EditorShell>;
}

function ActivityEditor({pkg,day,value,refs,busy,setBusy,onClose,onError}:{pkg:PackageDetail;day:PackageItineraryDay;value:PackageDayActivity|null;refs:PackageReferenceData;busy:boolean;setBusy:(v:boolean)=>void;onClose:()=>void;onError:(v:string|null)=>void}){
 const [offeringId,setOfferingId]=React.useState(value?.activity_offering_id??""),[variantId,setVariantId]=React.useState(value?.activity_variant_id??""),[quantity,setQuantity]=React.useState(String(value?.quantity??1)),[optional,setOptional]=React.useState(value?.is_optional??false),[notes,setNotes]=React.useState(value?.notes??"");
 const available=refs.activity_offerings;const offering=refs.activity_offerings.find(x=>x.id===offeringId);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);onError(null);try{const result=await savePackageActivity(value?.id??null,pkg.id,{itinerary_day_id:day.id,activity_offering_id:offeringId,activity_variant_id:variantId||null,quantity:Number(quantity),is_optional:optional,notes:notes.trim()||null,display_order:value?.display_order??day.activities.length});if(!result.success){onError(result.error);return;}onClose();}catch(err){onError(getNetworkErrorMessage(err));}finally{setBusy(false);}}
 return <EditorShell title={`Activity · Day ${day.day_number}`} onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><VehicleSearchableSelect label="Activity offering" name="offering" value={offeringId} options={available.map(x=>({value:x.id,label:x.activity?.name??"Activity",description:x.location?.name}))} onValueChange={v=>{setOfferingId(v);setVariantId("");}} placeholder="Search activity" required/><VehicleSearchableSelect label="Variant" name="variant" value={variantId} options={(offering?.variants??[]).filter(x=>x.status==="active").map(x=>({value:x.id,label:x.name}))} onValueChange={setVariantId} placeholder="Base offering" emptyOptionLabel="Base offering"/><label className="space-y-1 text-sm font-medium">Quantity<Input required type="number" min={1} max={100} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="flex items-center gap-2 self-end rounded-lg border p-3 text-sm"><input type="checkbox" checked={optional} onChange={e=>setOptional(e.target.checked)}/>Optional activity (excluded from base price)</label><label className="space-y-1 text-sm font-medium sm:col-span-2">Notes<Textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={busy}>{busy?<Loader2 className="animate-spin"/>:<Save/>}Save activity</Button></div></form></EditorShell>;
}

function HotelEditor({pkg,day,value,refs,busy,setBusy,onClose,onError}:{pkg:PackageDetail;day:PackageItineraryDay;value:PackageDayHotel|null;refs:PackageReferenceData;busy:boolean;setBusy:(v:boolean)=>void;onClose:()=>void;onError:(v:string|null)=>void}){
 const [categoryId,setCategoryId]=React.useState(value?.hotel_category_id??""),[hotelId,setHotelId]=React.useState(value?.hotel_id??""),[roomId,setRoomId]=React.useState(value?.hotel_room_id??""),[mealPlan,setMealPlan]=React.useState(value?.meal_plan??"CP"),[primary,setPrimary]=React.useState(value?.is_primary??true),[notes,setNotes]=React.useState(value?.notes??"");
 const hotels=hotelsForOvernight(refs,day.overnight_location_id);
 const hotel=refs.hotels.find(x=>x.id===hotelId);
 const rooms=(hotel?.rooms??[]).filter(x=>x.status==="active"&&(!categoryId||x.category_id===categoryId));
 const pricingLocationId=hotel?.location_id??day.overnight_location_id;
 const resolved=resolvePackageHotelRate(refs.hotel_rates,{locationId:pricingLocationId,categoryId,hotelId,roomId:roomId||null,mealPlan});
 const hotelOptions=hotels.map(option=>{
  const rate=resolvePackageHotelRate(refs.hotel_rates,{locationId:option.location_id,categoryId,hotelId:option.id,roomId:null,mealPlan});
  const scope=hotelLocationLabel(refs,option.location_id);
  return {value:option.id,label:option.name,description:[scope,categoryId?(rate?`${hotelRateSourceLabel(rate.source)} · ${formatPackageMoney(rate.rate.base_room_rate_paise)}/room/night`:"No matching active rate"):"Choose a category to preview pricing"].filter(Boolean).join(" · ")};
 });
 const roomOptions=rooms.map(option=>{
  const rate=resolvePackageHotelRate(refs.hotel_rates,{locationId:pricingLocationId,categoryId,hotelId,roomId:option.id,mealPlan});
  return {value:option.id,label:option.name,description:rate?`${hotelRateSourceLabel(rate.source)} · ${formatPackageMoney(rate.rate.base_room_rate_paise)}/room/night`:"No matching active rate"};
 });
 const previews=resolved?[2,3,4,5,6].map(pax=>({pax,...calculateAdultRoomPrice(pax,1,resolved.rate)})):[];
 async function submit(e:React.FormEvent){e.preventDefault();onError(null);if(!day.overnight_location_id){onError("Set the overnight location on this itinerary day before selecting a hotel.");return;}if(!categoryId||!hotelId){onError("Select a package category and hotel.");return;}if(!resolved){onError("No active room, hotel or location rate matches this selection. Configure hotel pricing first.");return;}setBusy(true);try{const result=await savePackageHotel(value?.id??null,pkg.id,{itinerary_day_id:day.id,hotel_category_id:categoryId,hotel_id:hotelId,hotel_room_id:roomId||null,meal_plan:mealPlan,is_primary:primary,notes:notes.trim()||null,display_order:value?.display_order??day.hotels.length});if(!result.success){onError(result.error);return;}onClose();}catch(err){onError(getNetworkErrorMessage(err));}finally{setBusy(false);}}
 return <EditorShell title={`Hotel · Day ${day.day_number}`} onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
  {!day.overnight_location_id&&<div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>Edit Day {day.day_number} and select an overnight location first. Hotel availability and pricing are location-based.</span></div>}
  <VehicleSearchableSelect label="Package category" name="hotel_category" value={categoryId} options={refs.hotel_categories.map(x=>({value:x.id,label:x.name}))} onValueChange={v=>{setCategoryId(v);setHotelId("");setRoomId("");}} placeholder="Choose category" required/>
  <VehicleSearchableSelect label="Hotel" name="hotel" value={hotelId} options={hotelOptions} onValueChange={v=>{setHotelId(v);setRoomId("");}} placeholder={day.overnight_location_id?"Search hotels in this destination":"Set overnight location first"} required/>
  <VehicleSearchableSelect label="Room" name="room" value={roomId} options={roomOptions} onValueChange={setRoomId} placeholder="Use hotel/category rate" emptyOptionLabel="No specific room"/>
  <label className="space-y-1 text-sm font-medium">Meal plan<select className={select} value={mealPlan} onChange={e=>{setMealPlan(e.target.value as typeof mealPlan);setRoomId("");}}><option value="EP">EP · Room only</option><option value="CP">CP · Breakfast</option><option value="MAP">MAP · Breakfast + one meal</option><option value="AP">AP · All meals</option></select></label>
  <div className={`rounded-xl border p-4 sm:col-span-2 ${resolved?"border-emerald-500/30 bg-emerald-500/5":"border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
   {resolved?<><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><IndianRupee className="h-4 w-4 text-primary"/>Effective hotel pricing</p><p className="mt-1 text-xs text-muted-foreground">{hotel&&`${hotelLocationLabel(refs,hotel.location_id)} · `}{hotelRateSourceLabel(resolved.source)} · {mealPlan} · tax included</p></div><div className="text-right"><p className="text-lg font-bold">{formatPackageMoney(resolved.rate.base_room_rate_paise)}</p><p className="text-xs text-muted-foreground">per room / night</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{previews.map(item=><div key={item.pax} className="rounded-lg border bg-background p-2.5 text-center"><p className="text-[11px] text-muted-foreground">{item.pax} PAX</p><p className="text-sm font-semibold">{formatPackageMoney(item.totalPaise)}</p><p className="text-[10px] text-muted-foreground">{item.rooms} room{item.rooms>1?"s":""}{item.extraBeds?" + bed":""}</p></div>)}</div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs text-muted-foreground"><span>Extra adult: {formatPackageMoney(resolved.rate.extra_adult_bed_paise)}</span><span>Child with bed: {formatPackageMoney(resolved.rate.child_with_bed_paise)}</span><span>Child sharing: {formatPackageMoney(resolved.rate.child_without_bed_paise)}</span></div></>:<div className="flex gap-2 text-sm text-amber-900 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>{hotelId&&categoryId?"No active rate matches this location, category, hotel/room and meal plan.":"Select category and hotel to see the inherited rate and 2–6 PAX preview."}</span></div>}
  </div>
  <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={primary} onChange={e=>setPrimary(e.target.checked)}/>Primary hotel for this category</label>
  <label className="space-y-1 text-sm font-medium sm:col-span-2">Notes<Textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={busy||!resolved}>{busy?<Loader2 className="animate-spin"/>:<Save/>}Save hotel</Button></div>
 </form></EditorShell>;
}
