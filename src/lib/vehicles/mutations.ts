"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { requirePermission } from "@/lib/auth";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { createVehicleDatabaseClient } from "./database";
import {
  driverSchema,
  fleetVehicleSchema,
  transportVendorSchema,
  vehicleCategorySchema,
  vehicleModelSchema,
  vehicleRateSchema,
  type DriverValues,
  type FleetVehicleValues,
  type TransportVendorValues,
  type VehicleCategoryValues,
  type VehicleModelValues,
  type VehicleRateValues,
} from "./validations";

type Result = { success: true } | { success: false; error: string };
type VehicleTable =
  | "vehicle_categories"
  | "vehicle_models"
  | "transport_vendors"
  | "drivers"
  | "fleet_vehicles"
  | "vehicle_rate_cards";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error) {
    const databaseError = error as { code?: string; message?: string; details?: string };
    if (databaseError.code === "23503") return getDeleteDependencyMessage(databaseError, fallback);
    if (databaseError.code === "23505") return "A record with the same unique value already exists.";
    if (databaseError.message?.trim()) return databaseError.message;
  }
  return error instanceof Error ? error.message : fallback;
}

async function assertSaved(
  query: PromiseLike<{ data: { id: string } | null; error: PostgrestError | null }>,
) {
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.id) throw new Error("The record could not be saved.");
  revalidatePath("/home/vehicles");
}

export async function saveVehicleCategory(id: string | null, values: VehicleCategoryValues): Promise<Result> {
  try {
    await requirePermission(id ? "vehicles.update" : "vehicles.create");
    const parsed = vehicleCategorySchema.parse(values);
    const db = await createVehicleDatabaseClient();
    await assertSaved(id
      ? db.from("vehicle_categories").update(parsed).eq("id", id).select("id").single()
      : db.from("vehicle_categories").insert(parsed).select("id").single());
    return { success: true };
  } catch (error) { return { success: false, error: errorMessage(error, "Failed to save vehicle category.") }; }
}

export async function saveVehicleModel(id: string | null, values: VehicleModelValues): Promise<Result> {
  try {
    await requirePermission(id ? "vehicles.update" : "vehicles.create");
    const parsed = vehicleModelSchema.parse(values);
    const db = await createVehicleDatabaseClient();
    await assertSaved(id
      ? db.from("vehicle_models").update(parsed).eq("id", id).select("id").single()
      : db.from("vehicle_models").insert(parsed).select("id").single());
    return { success: true };
  } catch (error) { return { success: false, error: errorMessage(error, "Failed to save vehicle model.") }; }
}

export async function saveTransportVendor(id: string | null, values: TransportVendorValues): Promise<Result> {
  try {
    await requirePermission(id ? "vehicles.update" : "vehicles.create");
    const parsed = transportVendorSchema.parse(values);
    const db = await createVehicleDatabaseClient();
    await assertSaved(id
      ? db.from("transport_vendors").update(parsed).eq("id", id).select("id").single()
      : db.from("transport_vendors").insert(parsed).select("id").single());
    return { success: true };
  } catch (error) { return { success: false, error: errorMessage(error, "Failed to save transport vendor.") }; }
}

export async function saveDriver(id: string | null, values: DriverValues): Promise<Result> {
  try {
    await requirePermission(id ? "vehicles.update" : "vehicles.create");
    const parsed = driverSchema.parse(values);
    const db = await createVehicleDatabaseClient();
    await assertSaved(id
      ? db.from("drivers").update(parsed).eq("id", id).select("id").single()
      : db.from("drivers").insert(parsed).select("id").single());
    return { success: true };
  } catch (error) { return { success: false, error: errorMessage(error, "Failed to save driver.") }; }
}

export async function saveFleetVehicle(id: string | null, values: FleetVehicleValues): Promise<Result> {
  try {
    await requirePermission(id ? "vehicles.update" : "vehicles.create");
    const parsed = fleetVehicleSchema.parse(values);
    const db = await createVehicleDatabaseClient();
    await assertSaved(id
      ? db.from("fleet_vehicles").update(parsed).eq("id", id).select("id").single()
      : db.from("fleet_vehicles").insert(parsed).select("id").single());
    return { success: true };
  } catch (error) { return { success: false, error: errorMessage(error, "Failed to save fleet vehicle.") }; }
}

export async function saveVehicleRate(id: string | null, values: VehicleRateValues): Promise<Result> {
  try {
    await requirePermission("vehicles.manage_pricing");
    const parsed = vehicleRateSchema.parse(values);
    const db = await createVehicleDatabaseClient();
    const userId = (await db.auth.getUser()).data.user?.id ?? null;
    await assertSaved(id
      ? db.from("vehicle_rate_cards").update({ ...parsed, updated_by: userId }).eq("id", id).select("id").single()
      : db.from("vehicle_rate_cards").insert({ ...parsed, created_by: userId, updated_by: userId }).select("id").single());
    return { success: true };
  } catch (error) { return { success: false, error: errorMessage(error, "Failed to save vehicle rate.") }; }
}

const DELETE_TABLES = {
  category: "vehicle_categories",
  model: "vehicle_models",
  vendor: "transport_vendors",
  driver: "drivers",
  fleet: "fleet_vehicles",
  rate: "vehicle_rate_cards",
} as const satisfies Record<string, VehicleTable>;
type DeletableVehicleKind = keyof typeof DELETE_TABLES;

export async function deleteVehicleRecord(kind: DeletableVehicleKind, id: string): Promise<Result> {
  try {
    if (!Object.hasOwn(DELETE_TABLES, kind)) throw new Error("Invalid vehicle record type.");
    await requirePermission(kind === "rate" ? "vehicles.manage_pricing" : "vehicles.delete");
    const db = await createVehicleDatabaseClient();
    const { error } = await db.from(DELETE_TABLES[kind]).delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/home/vehicles");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "This record cannot be deleted because it is already in use. Set it inactive instead.") };
  }
}
