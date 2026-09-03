"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import type { PermissionKey } from "@/config/permissions";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { createPackageDatabaseClient } from "./database";
import { resolveHotelRate } from "@/lib/hotels/pricing";
import type { HotelRateCard } from "@/types/hotel";
import {
  packageActivitySchema, packageAdjustmentSchema, packageContentSchema, packageDaySchema, packageFaqSchema,
  packageContentTemplateItemSchema, packageContentTemplateSchema, packageContentTemplateSectionSchema,
  packageHotelSchema, packageSchema, packageVehicleSchema,
  type PackageActivityValues, type PackageAdjustmentValues, type PackageContentValues, type PackageDayValues,
  type PackageContentTemplateItemValues, type PackageContentTemplateSectionValues, type PackageContentTemplateValues,
  type PackageFaqValues, type PackageHotelValues, type PackageValues, type PackageVehicleValues,
} from "./validations";

type Result<T=undefined> = T extends undefined ? {success:true}|{success:false;error:string} : {success:true;data:T}|{success:false;error:string};
function message(error:unknown,fallback:string){
  if(typeof error==="object"&&error){const e=error as {code?:string;message?:string;details?:string};
    if(e.code==="23503")return getDeleteDependencyMessage(e,fallback);
    if(e.code==="23505")return "A record with the same unique value already exists.";
    if(e.code==="42501")return "Your role does not have permission to perform this action.";
    if(e.message?.trim())return e.message;}
  return error instanceof Error?error.message:fallback;
}
function refresh(packageId?:string){revalidatePath("/home/packages");if(packageId)revalidatePath(`/home/packages/${packageId}/edit`);}
function corePayload(values:PackageValues){const {gallery_asset_ids,destination_ids,apply_content_defaults,...payload}=values;void gallery_asset_ids;void destination_ids;void apply_content_defaults;return payload;}

export async function savePackageCore(id:string|null,values:PackageValues):Promise<Result<{id:string}>>{
  try{
    const parsed=packageSchema.parse(values);await requirePermission(id?"packages.update":"packages.create");
    if(parsed.status==="published")await requirePermission("packages.publish");
    const db=await createPackageDatabaseClient();
    const {data,error}=await db.rpc("save_package_core_with_defaults",{p_package_id:id,p_package:corePayload(parsed),p_gallery_asset_ids:[...new Set(parsed.gallery_asset_ids)],p_destination_ids:[...new Set(parsed.destination_ids)],p_apply_content_defaults:parsed.apply_content_defaults});
    if(error)throw error;if(!data)throw new Error("Package could not be saved.");const savedId=String(data);refresh(savedId);
    return {success:true,data:{id:savedId}};
  }catch(error){console.error("Save package failed:",error);return {success:false,error:message(error,"Failed to save package.")};}
}

async function saveRow<T extends Record<string,unknown>>(options:{id:string|null;table:string;values:T;permission:PermissionKey;packageId:string;fallback:string}):Promise<Result<{id:string}>>{
  try{await requirePermission(options.permission);const db=await createPackageDatabaseClient();
    const query=options.id?db.from(options.table).update(options.values as never).eq("id",options.id):db.from(options.table).insert(options.values as never);
    const {data,error}=await query.select("id").single();if(error)throw error;if(!data?.id)throw new Error("The record could not be saved.");refresh(options.packageId);return {success:true,data:{id:String(data.id)}};
  }catch(error){console.error(options.fallback,error);return {success:false,error:message(error,options.fallback)};}
}

export async function savePackageDay(id:string|null,values:PackageDayValues):Promise<Result<{id:string}>>{try{const v=packageDaySchema.parse(values);return await saveRow({id,table:"package_itinerary_days",values:v,permission:"packages.update",packageId:v.package_id,fallback:"Failed to save itinerary day."});}catch(e){return{success:false,error:message(e,"Failed to save itinerary day.")};}}
export async function savePackageActivity(id:string|null,packageId:string,values:PackageActivityValues):Promise<Result<{id:string}>>{
  try{
    const v=packageActivitySchema.parse(values);
    await requirePermission("packages.update");
    const db=await createPackageDatabaseClient();
    const {data:day,error:dayError}=await db.from("package_itinerary_days").select("package_id").eq("id",v.itinerary_day_id).maybeSingle();
    if(dayError||!day)throw dayError??new Error("Itinerary day was not found.");
    if(day.package_id!==packageId)throw new Error("This itinerary day does not belong to the selected package.");
    const {data:offering,error:offeringError}=await db.from("activity_offerings").select("status").eq("id",v.activity_offering_id).maybeSingle();
    if(offeringError||!offering)throw offeringError??new Error("Activity offering was not found.");
    if(offering.status!=="active")throw new Error("The selected activity offering is inactive.");
    if(id){
      const {data:existing,error:existingError}=await db.from("package_day_activities").select("itinerary_day:package_itinerary_days(package_id)").eq("id",id).maybeSingle();
      if(existingError||!existing)throw existingError??new Error("Package activity was not found.");
      const linkedDay=existing.itinerary_day as unknown as {package_id:string}|null;
      if(linkedDay?.package_id!==packageId)throw new Error("This activity does not belong to the selected package.");
    }
    const query=id?db.from("package_day_activities").update(v).eq("id",id):db.from("package_day_activities").insert(v);
    const {data,error}=await query.select("id").single();
    if(error)throw error;
    if(!data?.id)throw new Error("The package activity could not be saved.");
    refresh(packageId);
    return{success:true,data:{id:String(data.id)}};
  }catch(e){
    console.error("Failed to save package activity.",e);
    return{success:false,error:message(e,"Failed to save package activity.")};
  }
}
export async function savePackageHotel(id:string|null,packageId:string,values:PackageHotelValues):Promise<Result<{id:string}>>{
  try{
    const v=packageHotelSchema.parse(values);
    await requirePermission("packages.update");
    const db=await createPackageDatabaseClient();
    const {data:day,error:dayError}=await db.from("package_itinerary_days").select("package_id,overnight_location_id,overnight_location:locations!package_itinerary_days_overnight_location_id_fkey(destination_id)").eq("id",v.itinerary_day_id).maybeSingle();
    if(dayError||!day)throw dayError??new Error("Itinerary day was not found.");
    if(day.package_id!==packageId)throw new Error("This itinerary day does not belong to the selected package.");
    if(!day.overnight_location_id)throw new Error("Set the overnight location before selecting a hotel.");
    const {data:hotel,error:hotelError}=await db.from("hotels").select("location_id,status,location:locations(destination_id)").eq("id",v.hotel_id).maybeSingle();
    if(hotelError||!hotel)throw hotelError??new Error("Hotel was not found.");
    const overnightLocation=day.overnight_location as unknown as {destination_id:string}|null;
    const hotelLocation=hotel.location as unknown as {destination_id:string}|null;
    if(!overnightLocation?.destination_id||hotelLocation?.destination_id!==overnightLocation.destination_id)throw new Error("The hotel must belong to the itinerary overnight destination.");
    if(!["active","draft"].includes(hotel.status))throw new Error("The selected hotel is not available for package use.");
    if(v.hotel_room_id){
      const {data:room,error:roomError}=await db.from("hotel_rooms").select("hotel_id,category_id,status").eq("id",v.hotel_room_id).maybeSingle();
      if(roomError||!room)throw roomError??new Error("Hotel room was not found.");
      if(room.hotel_id!==v.hotel_id||room.category_id!==v.hotel_category_id)throw new Error("The selected room does not belong to this hotel and category.");
      if(room.status!=="active")throw new Error("The selected hotel room is inactive.");
    }
    const {data:rates,error:ratesError}=await db.from("hotel_rate_cards").select("*,category:hotel_categories(id,name,slug)").eq("location_id",hotel.location_id).eq("category_id",v.hotel_category_id).eq("meal_plan",v.meal_plan).eq("status","active").or(`hotel_id.is.null,hotel_id.eq.${v.hotel_id}`);
    if(ratesError)throw ratesError;
    const effectiveRate=resolveHotelRate((rates??[]) as unknown as HotelRateCard[],hotel.location_id,v.hotel_category_id,v.hotel_id,v.hotel_room_id,v.meal_plan);
    if(!effectiveRate)throw new Error("No active room, hotel or location rate matches this selection. Configure hotel pricing first.");
    if(id){
      const {data:existing,error:existingError}=await db.from("package_day_hotels").select("itinerary_day:package_itinerary_days(package_id)").eq("id",id).maybeSingle();
      if(existingError||!existing)throw existingError??new Error("Package hotel selection was not found.");
      const linkedDay=existing.itinerary_day as unknown as {package_id:string}|null;
      if(linkedDay?.package_id!==packageId)throw new Error("This hotel selection does not belong to the selected package.");
    }
    const query=id?db.from("package_day_hotels").update(v).eq("id",id):db.from("package_day_hotels").insert(v);
    const {data,error}=await query.select("id").single();
    if(error)throw error;
    if(!data?.id)throw new Error("The package hotel could not be saved.");
    refresh(packageId);
    return{success:true,data:{id:String(data.id)}};
  }catch(e){
    console.error("Failed to save package hotel.",e);
    return{success:false,error:message(e,"Failed to save package hotel.")};
  }
}
export async function savePackageVehicle(id:string|null,values:PackageVehicleValues):Promise<Result<{id:string}>>{try{const v=packageVehicleSchema.parse(values);return await saveRow({id,table:"package_vehicle_options",values:v,permission:"packages.update",packageId:v.package_id,fallback:"Failed to save vehicle rule."});}catch(e){return{success:false,error:message(e,"Failed to save vehicle rule.")};}}
export async function savePackageContent(id:string|null,values:PackageContentValues):Promise<Result<{id:string}>>{
  try{
    const v=packageContentSchema.parse(values);await requirePermission("packages.update");const db=await createPackageDatabaseClient();
    const payload={...v,is_customized:true};
    const query=id?db.from("package_content_items").update(payload).eq("id",id).eq("package_id",v.package_id):db.from("package_content_items").insert({...payload,is_system_generated:false,source_template_item_id:null,system_key:null});
    const {data,error}=await query.select("id").single();if(error)throw error;if(!data?.id)throw new Error("The package content item could not be saved.");refresh(v.package_id);return{success:true,data:{id:String(data.id)}};
  }catch(e){return{success:false,error:message(e,"Failed to save package content.")};}
}

export async function syncPackageContentDefaults(packageId:string):Promise<Result<{inserted:number}>>{
  try{await requirePermission("packages.update");const db=await createPackageDatabaseClient();const {data,error}=await db.rpc("sync_package_content_defaults",{p_package_id:packageId,p_replace:true});if(error)throw error;refresh(packageId);return{success:true,data:{inserted:Number(data??0)}};}
  catch(e){return{success:false,error:message(e,"Failed to sync package content defaults.")};}
}

export async function savePackageContentTemplate(id:string|null,values:PackageContentTemplateValues):Promise<Result<{id:string}>>{
  try{await requirePermission("packages.manage_defaults");const v=packageContentTemplateSchema.parse(values);const db=await createPackageDatabaseClient();const payload={...v,updated_by:(await db.auth.getUser()).data.user?.id??null};const query=id?db.from("package_content_templates").update(payload).eq("id",id):db.from("package_content_templates").insert({...payload,created_by:payload.updated_by,is_default:false});const {data,error}=await query.select("id").single();if(error)throw error;if(!data?.id)throw new Error("Template could not be saved.");revalidatePath("/home/packages/content-defaults");return{success:true,data:{id:String(data.id)}};}
  catch(e){return{success:false,error:message(e,"Failed to save content template.")};}
}

async function saveTemplateRow<T extends Record<string,unknown>>(table:"package_content_template_sections"|"package_content_template_items",id:string|null,values:T,fallback:string):Promise<Result<{id:string}>>{
  try{await requirePermission("packages.manage_defaults");const db=await createPackageDatabaseClient();const query=id?db.from(table).update(values as never).eq("id",id):db.from(table).insert(values as never);const {data,error}=await query.select("id").single();if(error)throw error;if(!data?.id)throw new Error("Template record could not be saved.");revalidatePath("/home/packages/content-defaults");return{success:true,data:{id:String(data.id)}};}
  catch(e){return{success:false,error:message(e,fallback)};}
}

export async function savePackageContentTemplateSection(id:string|null,values:PackageContentTemplateSectionValues):Promise<Result<{id:string}>>{
  try{const v=packageContentTemplateSectionSchema.parse(values);return await saveTemplateRow("package_content_template_sections",id,v,"Failed to save template section.");}
  catch(e){return{success:false,error:message(e,"Failed to save template section.")};}
}

export async function savePackageContentTemplateItem(id:string|null,values:PackageContentTemplateItemValues):Promise<Result<{id:string}>>{
  try{const v=packageContentTemplateItemSchema.parse(values);return await saveTemplateRow("package_content_template_items",id,v,"Failed to save template item.");}
  catch(e){return{success:false,error:message(e,"Failed to save template item.")};}
}

export async function setDefaultPackageContentTemplate(id:string):Promise<Result>{
  try{await requirePermission("packages.manage_defaults");const db=await createPackageDatabaseClient();const {error}=await db.rpc("set_default_package_content_template",{p_template_id:id});if(error)throw error;revalidatePath("/home/packages/content-defaults");return{success:true};}
  catch(e){return{success:false,error:message(e,"Failed to set the default template.")};}
}

const templateTables={template:"package_content_templates",section:"package_content_template_sections",item:"package_content_template_items"} as const;
export async function deletePackageContentTemplateRecord(kind:keyof typeof templateTables,id:string):Promise<Result>{
  try{await requirePermission("packages.manage_defaults");const db=await createPackageDatabaseClient();if(kind==="template"){const {data,error}=await db.from("package_content_templates").select("is_default").eq("id",id).maybeSingle();if(error||!data)throw error??new Error("Template was not found.");if(data.is_default)throw new Error("Choose another default template before deleting this one.");}const {error}=await db.from(templateTables[kind]).delete().eq("id",id);if(error)throw error;revalidatePath("/home/packages/content-defaults");return{success:true};}
  catch(e){return{success:false,error:message(e,"This template record could not be deleted.")};}
}
export async function savePackageFaq(id:string|null,values:PackageFaqValues):Promise<Result<{id:string}>>{try{const v=packageFaqSchema.parse(values);return await saveRow({id,table:"package_faqs",values:v,permission:"packages.update",packageId:v.package_id,fallback:"Failed to save FAQ."});}catch(e){return{success:false,error:message(e,"Failed to save FAQ.")};}}
export async function savePackageAdjustment(id:string|null,values:PackageAdjustmentValues):Promise<Result<{id:string}>>{try{const v=packageAdjustmentSchema.parse(values);return await saveRow({id,table:"package_price_adjustments",values:v,permission:"packages.manage_pricing",packageId:v.package_id,fallback:"Failed to save price adjustment."});}catch(e){return{success:false,error:message(e,"Failed to save price adjustment.")};}}

const childTables={day:"package_itinerary_days",activity:"package_day_activities",hotel:"package_day_hotels",vehicle:"package_vehicle_options",content:"package_content_items",faq:"package_faqs",adjustment:"package_price_adjustments"} as const;
export async function deletePackageChild(kind:keyof typeof childTables,id:string,packageId:string):Promise<Result>{
  try{if(!Object.hasOwn(childTables,kind))throw new Error("Invalid package record type.");await requirePermission(kind==="adjustment"?"packages.manage_pricing":"packages.update");
    const db=await createPackageDatabaseClient();const {error}=await db.from(childTables[kind]).delete().eq("id",id);if(error)throw error;refresh(packageId);return {success:true};
  }catch(error){return {success:false,error:message(error,"This item cannot be deleted because it is already in use.")};}
}
export async function deletePackage(id:string):Promise<Result>{
  try{await requirePermission("packages.delete");const db=await createPackageDatabaseClient();const {error}=await db.from("packages").delete().eq("id",id);if(error)throw error;refresh();return {success:true};}
  catch(error){return {success:false,error:message(error,"This package cannot be deleted because it is already used by a booking. Archive it instead.")};}
}
export async function setPackageStatus(id:string,status:"draft"|"published"|"inactive"|"archived"):Promise<Result>{
  try{await requirePermission(status==="published"?"packages.publish":"packages.update");const db=await createPackageDatabaseClient();const {data,error}=await db.from("packages").update({status}).eq("id",id).select("id").single();if(error)throw error;if(!data)throw new Error("Package was not found.");refresh(id);return {success:true};}
  catch(error){return {success:false,error:message(error,"Failed to change package status.")};}
}
