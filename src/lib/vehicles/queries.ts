import { createVehicleDatabaseClient } from "./database";
import type {
  Driver,
  FleetVehicle,
  TransportVendor,
  VehicleAdminData,
  VehicleCategory,
  VehicleModel,
  VehicleRateCard,
} from "@/types/vehicle";

export async function getVehicleAdminData(): Promise<VehicleAdminData> {
  const db = await createVehicleDatabaseClient();
  const [categories, models, vendors, drivers, fleet, rates] = await Promise.all([
    db.from("vehicle_categories").select("*").order("name").limit(500),
    db.from("vehicle_models").select("*,category:vehicle_categories(id,name,slug)").order("name").limit(1000),
    db.from("transport_vendors").select("*,base_location:locations(id,name,destination:destinations(name,region:regions(name,country:countries(name))))").order("name").limit(1000),
    db.from("drivers").select("*,vendor:transport_vendors(id,name)").order("first_name").limit(2000),
    db.from("fleet_vehicles").select("*,vendor:transport_vendors(id,name),model:vehicle_models(*,category:vehicle_categories(id,name,slug))").order("registration_number").limit(2000),
    db.from("vehicle_rate_cards").select("*,base_location:locations(id,name,destination:destinations(name,region:regions(name,country:countries(name)))),category:vehicle_categories(id,name,slug),model:vehicle_models(id,name,slug),vendor:transport_vendors(id,name)").order("created_at", { ascending: false }).limit(2000),
  ]);
  const failed = [categories, models, vendors, drivers, fleet, rates].find((result) => result.error);
  if (failed?.error) {
    console.error("Load vehicle administration failed:", failed.error);
    throw new Error("Failed to load vehicle management data.");
  }
  return {
    categories: (categories.data ?? []) as unknown as VehicleCategory[],
    models: (models.data ?? []) as unknown as VehicleModel[],
    vendors: (vendors.data ?? []) as unknown as TransportVendor[],
    drivers: (drivers.data ?? []) as unknown as Driver[],
    fleet: (fleet.data ?? []) as unknown as FleetVehicle[],
    rates: (rates.data ?? []) as unknown as VehicleRateCard[],
  };
}
