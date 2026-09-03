"use server";

import { revalidatePath } from "next/cache";
import type { PermissionKey } from "@/config/permissions";
import { getUserPermissions, requirePermission } from "@/lib/auth";
import { getDeleteDependencyMessage } from "@/lib/database/delete-error";
import { createActivityDatabaseClient } from "./database";
import {
  activitySchema,
  chargeSchema,
  faqSchema,
  offeringSchema,
  participantPriceSchema,
  slotSchema,
  variantSchema,
  type ActivityFormValues,
  type ChargeFormValues,
  type FaqFormValues,
  type OfferingFormValues,
  type ParticipantPriceFormValues,
  type SlotFormValues,
  type VariantFormValues,
} from "./validations";

type MutationResult<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

async function requireAnyPermission(keys: PermissionKey[]) {
  const permissions = await getUserPermissions();
  if (!keys.some((key) => permissions.includes(key)))
    throw new Error("You do not have permission to perform this action.");
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "code" in error) {
    return getDeleteDependencyMessage(
      error as { code?: string; message?: string; details?: string },
      fallback,
    );
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Package prices are calculated from current activity pricing records rather
 * than copied into every package. Invalidate package editors after a pricing
 * mutation so linked packages read the latest rules on their next render.
 * Booking and quotation snapshots are intentionally not changed here.
 */
function revalidateActivityPricingConsumers() {
  revalidatePath("/home/activities");
  revalidatePath("/home/activities/[id]/edit", "page");
  revalidatePath("/home/packages");
  revalidatePath("/home/packages/[id]/edit", "page");
}

function activityPayload(values: ActivityFormValues) {
  const { gallery_asset_ids, ...payload } = values;
  void gallery_asset_ids;
  return payload;
}

async function saveActivityTransaction(
  id: string | null,
  parsed: ActivityFormValues,
) {
  const supabase = await createActivityDatabaseClient();
  const { data, error } = await supabase.rpc("save_activity_with_gallery", {
    p_activity_id: id,
    p_activity: activityPayload(parsed),
    p_gallery_asset_ids: [...new Set(parsed.gallery_asset_ids)],
  });

  if (error) {
    if (error.code === "23505")
      throw new Error("An activity with this slug already exists.");
    throw error;
  }
  if (!data) throw new Error("The activity could not be saved.");
  return String(data);
}

export async function createActivity(
  values: ActivityFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    await requirePermission("activities.create");
    const parsed = activitySchema.parse(values);
    const id = await saveActivityTransaction(null, parsed);
    revalidatePath("/home/activities");
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Create activity error:", error);
    return {
      success: false,
      error: errorMessage(error, "Failed to create activity."),
    };
  }
}

export async function updateActivity(
  id: string,
  values: ActivityFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    await requirePermission("activities.update");
    const parsed = activitySchema.parse(values);
    await saveActivityTransaction(id, parsed);
    revalidatePath("/home/activities");
    revalidatePath(`/home/activities/${id}/edit`);
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Update activity error:", error);
    return {
      success: false,
      error: errorMessage(error, "Failed to update activity."),
    };
  }
}

export async function deleteActivity(id: string): Promise<MutationResult> {
  try {
    await requirePermission("activities.delete");
    const supabase = await createActivityDatabaseClient();
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/home/activities");
    return { success: true };
  } catch (error) {
    console.error("Delete activity error:", error);
    return {
      success: false,
      error: errorMessage(
        error,
        "This activity could not be deleted. Archive it if it is already in use.",
      ),
    };
  }
}

export async function saveOffering(
  id: string | null,
  values: OfferingFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    await requireAnyPermission(
      id
        ? ["activities.manage_pricing"]
        : ["activities.create", "activities.manage_pricing"],
    );
    const parsed = offeringSchema.parse(values);
    const supabase = await createActivityDatabaseClient();
    if (id) {
      const { data: currentOffering, error: currentOfferingError } =
        await supabase
          .from("activity_offerings")
          .select("pricing_model")
          .eq("id", id)
          .maybeSingle();
      if (currentOfferingError || !currentOffering) {
        throw currentOfferingError ?? new Error("Activity offering was not found.");
      }

      if (currentOffering.pricing_model !== parsed.pricing_model) {
        if (parsed.pricing_model !== "per_person") {
          const { count, error } = await supabase
            .from("activity_participant_prices")
            .select("id", { count: "exact", head: true })
            .eq("activity_offering_id", id);
          if (error) throw error;
          if ((count ?? 0) > 0) {
            throw new Error(
              "Remove existing participant price rules before changing away from per-person pricing.",
            );
          }
        }

        if (parsed.pricing_model !== "per_unit") {
          const [variantResult, chargeResult] = await Promise.all([
            supabase
              .from("activity_variants")
              .select("id", { count: "exact", head: true })
              .eq("activity_offering_id", id)
              .not("capacity_override", "is", null),
            supabase
              .from("activity_charges")
              .select("id", { count: "exact", head: true })
              .eq("activity_offering_id", id)
              .eq("calculation_type", "per_unit"),
          ]);
          if (variantResult.error) throw variantResult.error;
          if (chargeResult.error) throw chargeResult.error;
          if ((variantResult.count ?? 0) > 0 || (chargeResult.count ?? 0) > 0) {
            throw new Error(
              "Remove unit-capacity overrides and per-unit charges before changing away from per-unit pricing.",
            );
          }
        }
      }
    }
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const query = id
      ? supabase
          .from("activity_offerings")
          .update({ ...parsed, updated_by: userId })
          .eq("id", id)
          .select("id")
          .single()
      : supabase
          .from("activity_offerings")
          .insert({ ...parsed, created_by: userId, updated_by: userId })
          .select("id")
          .single();
    const { data, error } = await query;
    if (error)
      throw error.code === "23505"
        ? new Error(
            "This activity already has an offering for the selected location.",
          )
        : error;
    revalidateActivityPricingConsumers();
    return { success: true, data: { id: String(data.id) } };
  } catch (error) {
    console.error("Save activity offering error:", error);
    return {
      success: false,
      error: errorMessage(error, "Failed to save the activity offering."),
    };
  }
}

export async function deleteOffering(
  id: string,
  activityId: string,
): Promise<MutationResult> {
  try {
    await requireAnyPermission([
      "activities.manage_pricing",
      "activities.delete",
    ]);
    const supabase = await createActivityDatabaseClient();
    const { error } = await supabase
      .from("activity_offerings")
      .delete()
      .eq("id", id)
      .eq("activity_id", activityId);
    if (error) throw error;
    revalidateActivityPricingConsumers();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(
        error,
        "This offering could not be deleted because it is already in use.",
      ),
    };
  }
}

type ChildTable =
  | "activity_variants"
  | "activity_participant_prices"
  | "activity_charges"
  | "activity_slots"
  | "activity_faqs";

async function saveChild<
  T extends { activity_offering_id?: string; activity_id?: string },
>(table: ChildTable, id: string | null, payload: T, permission: PermissionKey) {
  await requireAnyPermission(
    id ? [permission] : ["activities.create", permission],
  );
  const supabase = await createActivityDatabaseClient();
  const query = id
    ? supabase.from(table).update(payload).eq("id", id).select("id").single()
    : supabase.from(table).insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) throw error;
  return String(data.id);
}

async function requireOverridePermissionIfChanged(
  table: "activity_variants" | "activity_slots",
  id: string | null,
  nextOverride: number | null,
) {
  if (!id) {
    if (nextOverride !== null)
      await requirePermission("activities.override_price");
    return;
  }

  const supabase = await createActivityDatabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select("price_override_paise")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Pricing rule was not found.");
  if (data.price_override_paise !== nextOverride)
    await requirePermission("activities.override_price");
}

async function getOfferingPricingModel(offeringId: string) {
  const supabase = await createActivityDatabaseClient();
  const { data, error } = await supabase
    .from("activity_offerings")
    .select("pricing_model")
    .eq("id", offeringId)
    .maybeSingle();
  if (error || !data) {
    throw error ?? new Error("Activity offering was not found.");
  }
  return data.pricing_model as
    "per_unit" | "per_person" | "per_group" | "per_session";
}

export async function saveVariant(
  id: string | null,
  values: VariantFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    const parsed = variantSchema.parse(values);
    const pricingModel = await getOfferingPricingModel(
      parsed.activity_offering_id,
    );
    if (pricingModel !== "per_unit" && parsed.capacity_override !== null) {
      throw new Error("Capacity per unit applies only to per-unit pricing.");
    }
    await requireOverridePermissionIfChanged(
      "activity_variants",
      id,
      parsed.price_override_paise,
    );
    const savedId = await saveChild(
      "activity_variants",
      id,
      parsed,
      "activities.manage_pricing",
    );
    revalidateActivityPricingConsumers();
    return { success: true, data: { id: savedId } };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error, "Failed to save variant."),
    };
  }
}
export async function saveParticipantPrice(
  id: string | null,
  values: ParticipantPriceFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    const parsed = participantPriceSchema.parse(values);
    const pricingModel = await getOfferingPricingModel(
      parsed.activity_offering_id,
    );
    if (pricingModel !== "per_person") {
      throw new Error(
        "Participant prices can be added only to a per-person offering.",
      );
    }
    const savedId = await saveChild(
      "activity_participant_prices",
      id,
      parsed,
      "activities.manage_pricing",
    );
    revalidateActivityPricingConsumers();
    return { success: true, data: { id: savedId } };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error, "Failed to save participant price."),
    };
  }
}
export async function saveCharge(
  id: string | null,
  values: ChargeFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    const parsed = chargeSchema.parse(values);
    const pricingModel = await getOfferingPricingModel(
      parsed.activity_offering_id,
    );
    if (parsed.calculation_type === "per_unit" && pricingModel !== "per_unit") {
      throw new Error("Per-unit charges require a per-unit offering.");
    }
    const savedId = await saveChild(
      "activity_charges",
      id,
      parsed,
      "activities.manage_pricing",
    );
    revalidateActivityPricingConsumers();
    return { success: true, data: { id: savedId } };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error, "Failed to save additional charge."),
    };
  }
}
export async function saveSlot(
  id: string | null,
  values: SlotFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    const parsed = slotSchema.parse(values);
    await requireOverridePermissionIfChanged(
      "activity_slots",
      id,
      parsed.price_override_paise,
    );
    const savedId = await saveChild(
      "activity_slots",
      id,
      parsed,
      "activities.manage_pricing",
    );
    revalidateActivityPricingConsumers();
    return { success: true, data: { id: savedId } };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error, "Failed to save time slot."),
    };
  }
}
export async function saveFaq(
  id: string | null,
  values: FaqFormValues,
): Promise<MutationResult<{ id: string }>> {
  try {
    const parsed = faqSchema.parse(values);
    const savedId = await saveChild(
      "activity_faqs",
      id,
      parsed,
      "activities.update",
    );
    return { success: true, data: { id: savedId } };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error, "Failed to save FAQ."),
    };
  }
}

export async function deleteActivityChild(
  table: ChildTable,
  id: string,
  activityId: string,
): Promise<MutationResult> {
  try {
    const permission: PermissionKey =
      table === "activity_faqs"
        ? "activities.update"
        : "activities.manage_pricing";
    await requireAnyPermission([permission, "activities.delete"]);
    const supabase = await createActivityDatabaseClient();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    if (table === "activity_faqs") {
      revalidatePath(`/home/activities/${activityId}/edit`);
    } else {
      revalidateActivityPricingConsumers();
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: errorMessage(
        error,
        "This record could not be deleted because it is already in use.",
      ),
    };
  }
}
