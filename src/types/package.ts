import type { ActivityCharge, ActivityParticipantPrice, ActivityVariant, PricingModel } from "@/types/activity";
import type { HotelRateCard } from "@/types/hotel";
import type { VehicleRateCard } from "@/types/vehicle";

export type PackageStatus = "draft" | "published" | "inactive" | "archived";
export type PackageContentType = "highlight" | "inclusion" | "exclusion" | "important_note" | "terms" | "cancellation" | "reschedule" | "value_promise";
export type PackageAsset = { id: string; original_url: string | null; file_name: string; alt_text: string | null };
export type PackageLocation = { id: string; name: string; destination?: { id: string; name: string } | null };
export type PackageDestination = { id: string; name: string; region?: { name: string; country?: { name: string } | null } | null };

export type PackageListItem = {
  id: string; name: string; slug: string; package_code: string | null; duration_days: number; duration_nights: number;
  status: PackageStatus; is_featured: boolean; created_at: string;
  primary_destination: { id: string; name: string } | null;
  featured_image: { original_url: string; alt_text: string | null } | null;
  itinerary_days: Array<{ id: string }>;
};

export type PackageMedia = { id: string; media_asset_id: string; caption: string | null; display_order: number; media_asset: PackageAsset | null };
export type PackageDayActivity = {
  id: string; itinerary_day_id: string; activity_offering_id: string; activity_variant_id: string | null;
  quantity: number; is_optional: boolean; notes: string | null; display_order: number;
  offering?: PackageActivityOffering | null; variant?: { id: string; name: string } | null;
};
export type PackageDayHotel = {
  id: string; itinerary_day_id: string; hotel_category_id: string; hotel_id: string; hotel_room_id: string | null;
  meal_plan: "EP" | "CP" | "MAP" | "AP"; is_primary: boolean; notes: string | null; display_order: number;
  category?: { id: string; name: string } | null; hotel?: { id: string; name: string } | null; room?: { id: string; name: string } | null;
};
export type PackageItineraryDay = {
  id: string; package_id: string; day_number: number; title: string; summary: string | null; description: string | null;
  start_location_id: string | null; end_location_id: string | null; overnight_location_id: string | null;
  distance_km: number | null; travel_minutes: number | null; vehicle_required: boolean;
  breakfast_included: boolean; lunch_included: boolean; dinner_included: boolean; notes: string | null;
  start_location?: PackageLocation | null; end_location?: PackageLocation | null; overnight_location?: PackageLocation | null;
  activities: PackageDayActivity[]; hotels: PackageDayHotel[];
};
export type PackageVehicleOption = {
  id: string; package_id: string; minimum_pax: number; maximum_pax: number; base_location_id: string;
  vehicle_category_id: string; vehicle_model_id: string | null; vendor_id: string | null; quantity: number; billable_days: number;
  notes: string | null; display_order: number;
  base_location?: PackageLocation | null; category?: { id: string; name: string } | null;
  model?: { id: string; name: string } | null; vendor?: { id: string; name: string } | null;
};
export type PackageContentItem = {
  id: string; package_id: string; item_type: PackageContentType; section_title: string; content: string; display_order: number;
  source_template_item_id: string | null; system_key: string | null; is_system_generated: boolean; is_customized: boolean;
};
export type PackageContentTemplateItem = { id: string; section_id: string; content: string; display_order: number; status: "active" | "inactive"; created_at: string; updated_at: string };
export type PackageContentTemplateSection = { id: string; template_id: string; section_type: PackageContentType; title: string; display_order: number; created_at: string; updated_at: string; items: PackageContentTemplateItem[] };
export type PackageContentTemplate = { id: string; name: string; slug: string; version: number; status: "draft" | "active" | "archived"; is_default: boolean; notes: string | null; created_at: string; updated_at: string; sections: PackageContentTemplateSection[] };
export type PackageFaq = { id: string; package_id: string; question: string; answer: string; display_order: number };
export type PackagePriceAdjustment = { id: string; package_id: string; hotel_category_id: string; markup_bps: number; fixed_adjustment_paise: number; rounding_multiple_paise: number; notes: string | null };

export type PackageDetail = {
  id: string; primary_destination_id: string; start_location_id: string | null; end_location_id: string | null;
  name: string; slug: string; package_code: string | null; short_description: string | null; description: string | null;
  duration_days: number; duration_nights: number; featured_image_asset_id: string | null; is_featured: boolean;
  status: PackageStatus; seo_title: string | null; seo_description: string | null; published_at: string | null;
  content_template_id: string | null; content_template_version: number | null; content_synced_at: string | null;
  created_at: string; updated_at: string; primary_destination: PackageDestination | null; start_location: PackageLocation | null;
  end_location: PackageLocation | null; featured_image: PackageAsset | null; gallery: PackageMedia[];
  destinations: Array<{ destination_id: string; display_order: number; destination: PackageDestination | null }>;
  itinerary: PackageItineraryDay[]; vehicles: PackageVehicleOption[]; content: PackageContentItem[]; faqs: PackageFaq[];
  price_adjustments: PackagePriceAdjustment[];
};

export type PackageActivityOffering = {
  id: string; activity_id: string; location_id: string; pricing_model: PricingModel; base_price_paise: number;
  minimum_participants: number; maximum_participants_per_unit: number | null; maximum_units_per_booking: number | null;
  maximum_participants_per_booking: number | null; minimum_billable_participants: number; tax_included: boolean; tax_rate_bps: number;
  status: string; activity: { id: string; name: string } | null; location: PackageLocation | null;
  variants: ActivityVariant[]; participant_prices: ActivityParticipantPrice[]; charges: ActivityCharge[];
};
export type PackageHotelOption = { id: string; name: string; location_id: string; status: string; rooms: Array<{ id: string; name: string; category_id: string; status: string }> };
export type PackageReferenceData = {
  destinations: PackageDestination[]; locations: PackageLocation[]; hotel_categories: Array<{ id: string; name: string; slug: string }>;
  hotels: PackageHotelOption[]; hotel_rates: HotelRateCard[]; activity_offerings: PackageActivityOffering[];
  vehicle_categories: Array<{ id: string; name: string }>; vehicle_models: Array<{ id: string; name: string; category_id: string }>;
  vehicle_vendors: Array<{ id: string; name: string; base_location_id: string }>; vehicle_rates: VehicleRateCard[];
};

export type PackagePermissions = { canCreate: boolean; canUpdate: boolean; canDelete: boolean; canManagePricing: boolean; canPublish: boolean; canBrowseMedia: boolean; canUploadMedia: boolean };
