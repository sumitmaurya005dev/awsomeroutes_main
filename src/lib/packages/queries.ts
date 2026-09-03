import { createPackageDatabaseClient } from "./database";
import type { PackageContentTemplate, PackageDetail, PackageListItem, PackageReferenceData, PackageStatus } from "@/types/package";

export async function getPackageContentTemplates():Promise<PackageContentTemplate[]>{
  const db=await createPackageDatabaseClient();
  const {data,error}=await db.from("package_content_templates").select("*,sections:package_content_template_sections(*,items:package_content_template_items(*))").order("is_default",{ascending:false}).order("updated_at",{ascending:false});
  if(error){console.error("Load package content templates failed:",error);throw new Error("Failed to load package content templates.");}
  return ((data??[]) as unknown as PackageContentTemplate[]).map(template=>({...template,sections:[...(template.sections??[])].map(section=>({...section,items:[...(section.items??[])].sort((a,b)=>a.display_order-b.display_order)})).sort((a,b)=>a.display_order-b.display_order)}));
}

export async function getPackages(filters: { page?: number; limit?: number; search?: string; status?: PackageStatus | "all" } = {}) {
  const page=Math.max(1,filters.page??1),limit=Math.min(100,Math.max(1,filters.limit??25)),from=(page-1)*limit;
  const db=await createPackageDatabaseClient();
  let query=db.from("packages").select("id,name,slug,package_code,duration_days,duration_nights,status,is_featured,created_at,primary_destination:destinations!packages_primary_destination_id_fkey(id,name),featured_image:media_assets!packages_featured_image_asset_id_fkey(original_url,alt_text),itinerary_days:package_itinerary_days(id)",{count:"exact"}).order("created_at",{ascending:false}).range(from,from+limit-1);
  if(filters.status&&filters.status!=="all")query=query.eq("status",filters.status);
  if(filters.search?.trim()){const search=filters.search.trim().replace(/[%_,()]/g,"");query=query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,package_code.ilike.%${search}%`);}
  const {data,error,count}=await query;if(error){console.error("Load packages failed:",error);throw new Error("Failed to load packages.");}
  return {data:(data??[]) as unknown as PackageListItem[],count:count??0,page,limit,totalPages:Math.max(1,Math.ceil((count??0)/limit))};
}

export async function getPackageById(id:string):Promise<PackageDetail|null>{
  const db=await createPackageDatabaseClient();
  const {data,error}=await db.from("packages").select(`*,primary_destination:destinations!packages_primary_destination_id_fkey(id,name,region:regions(name,country:countries(name))),start_location:locations!packages_start_location_id_fkey(id,name,destination:destinations(id,name)),end_location:locations!packages_end_location_id_fkey(id,name,destination:destinations(id,name)),featured_image:media_assets!packages_featured_image_asset_id_fkey(id,original_url,file_name,alt_text),gallery:package_media(id,media_asset_id,caption,display_order,media_asset:media_assets(id,original_url,file_name,alt_text)),destinations:package_destinations(destination_id,display_order,destination:destinations(id,name,region:regions(name,country:countries(name)))),itinerary:package_itinerary_days(*,start_location:locations!package_itinerary_days_start_location_id_fkey(id,name,destination:destinations(id,name)),end_location:locations!package_itinerary_days_end_location_id_fkey(id,name,destination:destinations(id,name)),overnight_location:locations!package_itinerary_days_overnight_location_id_fkey(id,name,destination:destinations(id,name)),activities:package_day_activities(*,offering:activity_offerings(id,activity_id,location_id,pricing_model,base_price_paise,minimum_participants,maximum_participants_per_unit,maximum_units_per_booking,maximum_participants_per_booking,minimum_billable_participants,tax_included,tax_rate_bps,status,activity:activities(id,name),location:locations(id,name)),variant:activity_variants(id,name)),hotels:package_day_hotels(*,category:hotel_categories(id,name),hotel:hotels(id,name),room:hotel_rooms(id,name))),vehicles:package_vehicle_options(*,base_location:locations(id,name,destination:destinations(id,name)),category:vehicle_categories(id,name),model:vehicle_models(id,name),vendor:transport_vendors(id,name)),content:package_content_items(*),faqs:package_faqs(*),price_adjustments:package_price_adjustments(*)`).eq("id",id).maybeSingle();
  if(error){console.error("Load package failed:",error);throw new Error("Failed to load package.");}if(!data)return null;
  const item=data as unknown as PackageDetail;
  item.gallery=[...(item.gallery??[])].sort((a,b)=>a.display_order-b.display_order);
  item.destinations=[...(item.destinations??[])].sort((a,b)=>a.display_order-b.display_order);
  item.itinerary=[...(item.itinerary??[])].map(day=>({...day,activities:[...(day.activities??[])].sort((a,b)=>a.display_order-b.display_order),hotels:[...(day.hotels??[])].sort((a,b)=>a.display_order-b.display_order)})).sort((a,b)=>a.day_number-b.day_number);
  item.vehicles=[...(item.vehicles??[])].sort((a,b)=>a.display_order-b.display_order);
  item.content=[...(item.content??[])].sort((a,b)=>a.display_order-b.display_order);
  item.faqs=[...(item.faqs??[])].sort((a,b)=>a.display_order-b.display_order);
  return item;
}

export async function getPackageReferenceData():Promise<PackageReferenceData>{
  const db=await createPackageDatabaseClient();
  const [destinations,locations,categories,hotels,rates,offerings,vehicleCategories,models,vendors,vehicleRates]=await Promise.all([
    db.from("destinations").select("id,name,region:regions(name,country:countries(name))").eq("status","active").order("name").limit(2000),
    db.from("locations").select("id,name,destination:destinations(id,name)").eq("status","active").order("name").limit(5000),
    db.from("hotel_categories").select("id,name,slug").eq("status","active").order("display_order").order("name"),
    db.from("hotels").select("id,name,location_id,status,rooms:hotel_rooms(id,name,category_id,status)").in("status",["active","draft"]).order("name").limit(3000),
    db.from("hotel_rate_cards").select("*,category:hotel_categories(id,name,slug)").eq("status","active").limit(10000),
    db.from("activity_offerings").select("id,activity_id,location_id,pricing_model,base_price_paise,minimum_participants,maximum_participants_per_unit,maximum_units_per_booking,maximum_participants_per_booking,minimum_billable_participants,tax_included,tax_rate_bps,status,activity:activities(id,name),location:locations(id,name,destination:destinations(id,name)),variants:activity_variants(*),participant_prices:activity_participant_prices(*),charges:activity_charges(*)").eq("status","active").limit(5000),
    db.from("vehicle_categories").select("id,name").eq("status","active").order("name"),
    db.from("vehicle_models").select("id,name,category_id").eq("status","active").order("name"),
    db.from("transport_vendors").select("id,name,base_location_id").eq("status","active").order("name"),
    db.from("vehicle_rate_cards").select("*,base_location:locations(id,name),category:vehicle_categories(id,name,slug),model:vehicle_models(id,name,slug),vendor:transport_vendors(id,name)").eq("status","active").limit(10000),
  ]);
  const failed=[destinations,locations,categories,hotels,rates,offerings,vehicleCategories,models,vendors,vehicleRates].find(x=>x.error);
  if(failed?.error){console.error("Load package reference data failed:",failed.error);throw new Error("Failed to load package reference data.");}
  return {destinations:(destinations.data??[]) as unknown as PackageReferenceData["destinations"],locations:(locations.data??[]) as unknown as PackageReferenceData["locations"],hotel_categories:(categories.data??[]) as unknown as PackageReferenceData["hotel_categories"],hotels:(hotels.data??[]) as unknown as PackageReferenceData["hotels"],hotel_rates:(rates.data??[]) as unknown as PackageReferenceData["hotel_rates"],activity_offerings:(offerings.data??[]) as unknown as PackageReferenceData["activity_offerings"],vehicle_categories:(vehicleCategories.data??[]) as unknown as PackageReferenceData["vehicle_categories"],vehicle_models:(models.data??[]) as unknown as PackageReferenceData["vehicle_models"],vehicle_vendors:(vendors.data??[]) as unknown as PackageReferenceData["vehicle_vendors"],vehicle_rates:(vehicleRates.data??[]) as unknown as PackageReferenceData["vehicle_rates"]};
}
