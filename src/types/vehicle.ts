export type RecordStatus = "active" | "inactive";
export type DriverStatus = RecordStatus | "unavailable";
export type FleetStatus = RecordStatus | "maintenance";
export type VehicleSection =
  | "catalog"
  | "vendors"
  | "fleet"
  | "drivers"
  | "rates";

export type VehicleCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_seating_capacity: number;
  default_comfort_capacity: number;
  default_luggage_capacity: number;
  status: RecordStatus;
  created_at: string;
};

export type VehicleModel = {
  id: string;
  category_id: string;
  manufacturer: string | null;
  name: string;
  slug: string;
  description: string | null;
  seating_capacity: number;
  comfort_capacity: number;
  luggage_capacity: number;
  status: RecordStatus;
  created_at: string;
  category: Pick<VehicleCategory, "id" | "name" | "slug"> | null;
};

export type VehicleLocation = {
  id: string;
  name: string;
  destination: {
    name: string;
    region: { name: string; country: { name: string } | null } | null;
  } | null;
};

export type TransportVendor = {
  id: string;
  base_location_id: string;
  name: string;
  slug: string;
  contact_person: string | null;
  phone: string | null;
  alternate_phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: RecordStatus;
  created_at: string;
  base_location: VehicleLocation | null;
};

export type Driver = {
  id: string;
  vendor_id: string | null;
  first_name: string;
  last_name: string | null;
  phone: string;
  alternate_phone: string | null;
  licence_number: string | null;
  licence_expiry: string | null;
  notes: string | null;
  status: DriverStatus;
  created_at: string;
  vendor: Pick<TransportVendor, "id" | "name"> | null;
};

export type FleetVehicle = {
  id: string;
  vendor_id: string | null;
  model_id: string;
  registration_number: string;
  color: string | null;
  manufacture_year: number | null;
  seating_capacity: number | null;
  comfort_capacity: number | null;
  luggage_capacity: number | null;
  notes: string | null;
  status: FleetStatus;
  created_at: string;
  vendor: Pick<TransportVendor, "id" | "name"> | null;
  model: VehicleModel | null;
};

export type VehicleRateCard = {
  id: string;
  base_location_id: string;
  category_id: string;
  model_id: string | null;
  vendor_id: string | null;
  daily_rate_paise: number;
  currency: "INR";
  all_inclusive: true;
  notes: string | null;
  status: RecordStatus;
  created_at: string;
  base_location: VehicleLocation | null;
  category: Pick<VehicleCategory, "id" | "name" | "slug"> | null;
  model: Pick<VehicleModel, "id" | "name" | "slug"> | null;
  vendor: Pick<TransportVendor, "id" | "name"> | null;
};

export type VehicleAdminData = {
  categories: VehicleCategory[];
  models: VehicleModel[];
  vendors: TransportVendor[];
  drivers: Driver[];
  fleet: FleetVehicle[];
  rates: VehicleRateCard[];
};

export type VehicleLocationOption = {
  id: string;
  name: string;
  destinationName: string;
  regionName: string;
  countryName: string;
};
