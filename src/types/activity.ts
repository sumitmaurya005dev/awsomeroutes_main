export type ActivityStatus = "draft" | "active" | "temporarily_unavailable" | "inactive";
export type OfferingStatus = "active" | "temporarily_unavailable" | "inactive";
export type PricingModel = "per_unit" | "per_person" | "per_group" | "per_session";
export type ParticipantType = "infant" | "child" | "adult" | "senior" | "participant";
export type ChargeCalculationType = "per_person" | "per_adult" | "per_child" | "per_unit" | "per_booking" | "fixed";

export type ActivityCategory = { id: string; name: string; slug: string };

export type ActivityListItem = {
  id: string;
  name: string;
  slug: string;
  category: ActivityCategory;
  status: ActivityStatus;
  is_featured: boolean;
  created_at: string;
  featured_image: { original_url: string; alt_text: string | null } | null;
  offering_count: number;
};

export type ActivityMediaItem = {
  id: string;
  media_asset_id: string;
  display_order: number;
  alt_text: string | null;
  caption: string | null;
  media_asset: { id: string; original_url: string; file_name: string; alt_text: string | null } | null;
};

export type ActivityVariant = {
  id: string;
  activity_offering_id: string;
  name: string;
  description: string | null;
  price_override_paise: number | null;
  capacity_override: number | null;
  duration_override_minutes: number | null;
  display_order: number;
  status: "active" | "inactive";
};

export type ActivityParticipantPrice = {
  id: string;
  activity_offering_id: string;
  activity_variant_id: string | null;
  participant_type: ParticipantType;
  minimum_age: number | null;
  maximum_age: number | null;
  price_paise: number;
  capacity_count: number;
  status: "active" | "inactive";
};

export type ActivityCharge = {
  id: string;
  activity_offering_id: string;
  activity_variant_id: string | null;
  name: string;
  calculation_type: ChargeCalculationType;
  amount_paise: number;
  mandatory: boolean;
  taxable: boolean;
  description: string | null;
  display_order: number;
  status: "active" | "inactive";
};

export type ActivitySlot = {
  id: string;
  activity_offering_id: string;
  activity_variant_id: string | null;
  name: string;
  start_time: string;
  end_time: string;
  price_override_paise: number | null;
  capacity_override: number | null;
  reporting_minutes_before: number;
  status: "active" | "inactive";
};

export type ActivityOffering = {
  id: string;
  activity_id: string;
  location_id: string;
  pricing_model: PricingModel;
  base_price_paise: number;
  currency: string;
  minimum_participants: number;
  maximum_participants_per_unit: number | null;
  maximum_units_per_booking: number | null;
  maximum_participants_per_booking: number | null;
  minimum_billable_participants: number;
  duration_minutes: number | null;
  tax_included: boolean;
  tax_rate_bps: number;
  meeting_point: string | null;
  latitude: number | null;
  longitude: number | null;
  reporting_instructions: string | null;
  advance_booking_hours: number;
  status: OfferingStatus;
  location: {
    id: string;
    name: string;
    destination: { id: string; name: string; region: { id: string; name: string; country: { id: string; name: string } | null } | null } | null;
  } | null;
  variants: ActivityVariant[];
  participant_prices: ActivityParticipantPrice[];
  charges: ActivityCharge[];
  slots: ActivitySlot[];
};

export type ActivityFaq = {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  status: "active" | "inactive";
};

export type ActivityDetail = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category: ActivityCategory;
  short_description: string | null;
  description: string | null;
  duration_minutes: number | null;
  difficulty_level: "easy" | "moderate" | "challenging" | "extreme" | null;
  minimum_age: number | null;
  maximum_age: number | null;
  minimum_weight_kg: number | null;
  maximum_weight_kg: number | null;
  safety_information: string | null;
  medical_restrictions: string | null;
  what_to_carry: string | null;
  inclusions: string | null;
  exclusions: string | null;
  highlights: string | null;
  featured_image_asset_id: string | null;
  status: ActivityStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  featured_image: { id: string; original_url: string; file_name: string; alt_text: string | null } | null;
  gallery: ActivityMediaItem[];
  offerings: ActivityOffering[];
  faqs: ActivityFaq[];
};

export type ActivityLocationOption = {
  id: string;
  name: string;
  destinationName: string;
  regionName: string;
  countryName: string;
};
