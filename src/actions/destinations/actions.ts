"use server";
import { createDestination, updateDestination } from "@/lib/destinations/mutations";
import type { DestinationFormValues } from "@/lib/destinations/validations";
export async function createDestinationAction(values: DestinationFormValues) { return createDestination(values); }
export async function updateDestinationAction(id: string, values: DestinationFormValues) { return updateDestination(id, values); }
