import type { PackageReferenceData } from "./package";
import type { HotelRoom } from "./hotel";
import type {
  Driver,
  FleetVehicle,
  VehicleCategory,
  VehicleModel,
} from "./vehicle";

export type ItineraryStatus =
  "draft" | "quoted" | "sent" | "accepted" | "rejected" | "expired";
export type ItineraryStay = {
  id: string;
  hotel_id: string;
  room_id: string | null;
  category_id: string;
  meal_plan: "EP" | "CP" | "MAP" | "AP";
  adults: number;
  children_with_bed: number;
  children_without_bed: number;
  infants: number;
  rooms: number;
  extra_adult_beds: number;
  override_total_paise: number | null;
  override_reason: string;
};
export type ItineraryActivity = {
  id: string;
  offering_id: string;
  variant_id: string | null;
  adults: number;
  children: number;
  infants: number;
  quantity: number;
  units: number | null;
  optional: boolean;
  optional_charge_ids: string[];
  override_total_paise: number | null;
  override_reason: string;
};
export type ItineraryDay = {
  id: string;
  day_number: number;
  title: string;
  description: string;
  start_location_id: string | null;
  end_location_id: string | null;
  overnight_location_id: string | null;
  distance_km: number | null;
  travel_minutes: number | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  stays: ItineraryStay[];
  activities: ItineraryActivity[];
};
export type ItineraryTransport = {
  id: string;
  start_day: number;
  end_day: number;
  base_location_id: string;
  category_id: string;
  model_id: string | null;
  vendor_id: string | null;
  fleet_id: string | null;
  driver_id: string | null;
  quantity: number;
  luggage_only: boolean;
  override_total_paise: number | null;
  override_reason: string;
};
export type ItineraryInput = {
  id: string;
  version: number;
  title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  travel_date: string;
  valid_until: string;
  adults: number;
  children: number;
  infants: number;
  luggage_count: number;
  source_package_id: string | null;
  markup_bps: number;
  discount_paise: number;
  total_override_paise: number | null;
  total_override_reason: string;
  advance_paise: number;
  show_hotel_cost: boolean;
  show_activity_cost: boolean;
  show_vehicle_cost: boolean;
  public_notes: string;
  internal_notes: string;
  terms: string;
  days: ItineraryDay[];
  transport: ItineraryTransport[];
};
export type ItineraryRow = Omit<ItineraryInput, "days" | "transport"> & {
  quote_number: number;
  status: ItineraryStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  current_revision: number;
};
export type ItineraryDetail = ItineraryInput &
  Pick<
    ItineraryRow,
    "quote_number" | "status" | "created_at" | "updated_at" | "current_revision"
  >;
export type ItineraryReferences = PackageReferenceData & {
  rooms: HotelRoom[];
  fleet: FleetVehicle[];
  drivers: Driver[];
  full_vehicle_categories: VehicleCategory[];
  full_vehicle_models: VehicleModel[];
};
export type QuoteLine = {
  id: string;
  day: number;
  kind: "hotel" | "activity" | "vehicle";
  label: string;
  detail: string;
  amount_paise: number;
  optional: boolean;
  rate_id: string | null;
};
export type ItineraryCalculation = {
  hotel_paise: number;
  activity_paise: number;
  vehicle_paise: number;
  subtotal_paise: number;
  calculated_total_paise: number;
  markup_paise: number;
  discount_paise: number;
  total_paise: number;
  advance_paise: number;
  balance_paise: number;
  warnings: string[];
  lines: QuoteLine[];
};
export type QuoteDocument = {
  schema_version: 1;
  reference: string;
  revision: number;
  title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  travel_date: string;
  valid_until: string;
  guests: string;
  issued_at: string;
  public_notes: string;
  terms: string;
  days: {
    day_number: number;
    date?: string;
    title: string;
    description: string;
    route: string;
    overnight: string;
    meals: string;
    distance_km: number | null;
    travel_minutes: number | null;
    services: { label: string; detail: string; optional: boolean }[];
  }[];
  costs: { label: string; amount_paise: number }[];
  total_paise: number;
  advance_paise: number;
  balance_paise: number;
};
export type ItineraryRevision = {
  id: string;
  itinerary_id: string;
  revision: number;
  document: QuoteDocument;
  calculation: ItineraryCalculation;
  created_at: string;
};
export type ItineraryPermissions = {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  pricing: boolean;
  finalize: boolean;
  export: boolean;
};
