export type HotelStatus =
  "draft" | "active" | "temporarily_unavailable" | "inactive";
export type MealPlan = "EP" | "CP" | "MAP" | "AP";
export type ChildPricingPolicy = "child_rates" | "adult_rate";

export type HotelCategory = { id: string; name: string; slug: string };
export type HotelAmenity = { id: string; name: string; slug: string };
export type HotelLocationOption = {
  id: string;
  name: string;
  destinationName: string;
  regionName: string;
  countryName: string;
};
export type HotelAsset = {
  id: string;
  original_url: string | null;
  file_name: string;
  alt_text: string | null;
};
export type HotelMedia = {
  id: string;
  media_asset_id: string;
  display_order: number;
  media_asset: HotelAsset | null;
};

export type HotelRoom = {
  id: string;
  hotel_id: string;
  category_id: string;
  category: HotelCategory;
  name: string;
  slug: string;
  description: string | null;
  bed_type: string | null;
  room_size_sqft: number | null;
  base_adults: number;
  maximum_adults: number;
  maximum_children: number;
  maximum_occupancy: number;
  maximum_extra_beds: number;
  child_sharing_allowed: boolean;
  infant_sharing_allowed: boolean;
  inventory_count: number | null;
  featured_image_asset_id: string | null;
  featured_image: HotelAsset | null;
  display_order: number;
  status: "active" | "inactive";
  gallery: HotelMedia[];
};

export type HotelRateCard = {
  id: string;
  location_id: string;
  category_id: string;
  category: HotelCategory;
  hotel_id: string | null;
  room_id: string | null;
  meal_plan: MealPlan;
  base_room_rate_paise: number;
  extra_adult_bed_paise: number;
  child_with_bed_paise: number;
  child_without_bed_paise: number;
  infant_sharing_paise: number;
  child_pricing_policy: ChildPricingPolicy;
  child_with_bed_allowed: boolean;
  child_without_bed_allowed: boolean;
  currency: string;
  tax_included: boolean;
  notes: string | null;
  status: "active" | "inactive";
};

export type HotelListItem = {
  id: string;
  name: string;
  slug: string;
  status: HotelStatus;
  is_featured: boolean;
  star_rating: number | null;
  created_at: string;
  location: {
    id: string;
    name: string;
    destination: { name: string } | null;
  } | null;
  featured_image: { original_url: string; alt_text: string | null } | null;
  room_count: number;
};

export type HotelDetail = {
  id: string;
  location_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  star_rating: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  policies: string | null;
  featured_image_asset_id: string | null;
  status: HotelStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  location: {
    id: string;
    name: string;
    destination: {
      id: string;
      name: string;
      region: {
        id: string;
        name: string;
        country: { id: string; name: string } | null;
      } | null;
    } | null;
  } | null;
  featured_image: HotelAsset | null;
  gallery: HotelMedia[];
  amenities: Array<{ amenity_id: string; amenity: HotelAmenity | null }>;
  rooms: HotelRoom[];
  rates: HotelRateCard[];
};
