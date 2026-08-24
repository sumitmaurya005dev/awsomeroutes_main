"use server";

import {
  createCountry,
  updateCountry,
  deleteCountry,
  updateCountryStatus,
} from "@/lib/countries/mutations";

import {
  createCountrySchema,
  updateCountrySchema,
} from "@/lib/countries/validations";

import type {
  Country,
  CountryInsert,
  CountryUpdate,
} from "@/types/country";
import { requirePermission } from "@/lib/auth";

export async function createCountryAction(
  payload: CountryInsert
) {
  await requirePermission("countries.create");
  const result = createCountrySchema.safeParse(payload);

  if (!result.success) {
    return {
      success: false as const,
      error: "Validation failed",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const country = await createCountry(result.data);

    return {
      success: true as const,
      data: country,
    };
  } catch (error) {
    console.error("Create country error:", error);

    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create country",
    };
  }
}

export async function updateCountryAction(
  id: string,
  payload: CountryUpdate
) {
  await requirePermission("countries.update");
  const result = updateCountrySchema.safeParse(payload);

  if (!result.success) {
    return {
      success: false as const,
      error: "Validation failed",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const country = await updateCountry(id, result.data);

    return {
      success: true as const,
      data: country,
      message: "Updated successfully",
    };
  } catch (error) {
    console.error("Update country error:", error);

    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update country",
    };
  }
}

export async function deleteCountryAction(id: string) {
  await requirePermission("countries.delete");
  try {
    await deleteCountry(id);

    return {
      success: true as const,
    };
  } catch (error) {
    console.error("Delete country error:", error);

    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete country",
    };
  }
}

export async function updateCountryStatusAction(
  id: string,
  status: Country["status"]
) {
  await requirePermission("countries.update");
  try {
    const country = await updateCountryStatus(id, status);

    return {
      success: true as const,
      data: country,
    };
  } catch (error) {
    console.error("Update country status error:", error);

    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update country status",
    };
  }
}
