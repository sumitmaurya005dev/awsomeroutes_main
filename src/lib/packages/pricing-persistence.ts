import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/security/log-server-error";
import { calculatePackagePriceMatrix } from "./pricing";
import { getPackageById, getPackageReferenceData } from "./queries";
import type { PackageReferenceData } from "@/types/package";

type PricingDatabase = SupabaseClient;

export type PackagePricingRefreshResult = {
  packageId: string;
  status: "ready" | "incomplete" | "stale";
  rowCount: number;
};

function adminDatabase(): PricingDatabase {
  return createAdminClient() as unknown as PricingDatabase;
}

function matrixRows(
  matrix: ReturnType<typeof calculatePackagePriceMatrix>,
) {
  return matrix.map((cell) => ({
    hotel_category_id: cell.categoryId,
    pax: cell.pax,
    occupancy_code: "standard",
    room_count: cell.roomCount,
    extra_bed_count: cell.extraBedCount,
    hotel_total_paise: cell.hotelPaise,
    activity_total_paise: cell.activityPaise,
    vehicle_total_paise: cell.vehiclePaise,
    adjustment_total_paise: cell.adjustmentPaise,
    group_total_paise: cell.groupTotalPaise,
    per_person_paise: cell.perPersonPaise,
    currency: "INR",
    is_complete: cell.warnings.length === 0,
    warnings: cell.warnings,
  }));
}

export async function rebuildPackagePricing(
  packageId: string,
  database: PricingDatabase = adminDatabase(),
  suppliedReferences?: PackageReferenceData,
): Promise<PackagePricingRefreshResult> {
  const [pkg, refs] = suppliedReferences
    ? [await getPackageById(packageId, database), suppliedReferences]
    : await Promise.all([
        getPackageById(packageId, database),
        getPackageReferenceData(database),
      ]);
  if (!pkg) throw new Error("Package was not found.");

  const rows = matrixRows(calculatePackagePriceMatrix(pkg, refs));
  if (!rows.length) throw new Error("Package pricing produced no rows.");

  const { data, error } = await database.rpc("replace_package_price_matrix", {
    p_package_id: packageId,
    p_rows: rows,
    p_expected_revision: pkg.pricing_revision,
  });
  if (error) throw error;

  const status = data === "ready" || data === "incomplete" ? data : "stale";

  return {
    packageId,
    status,
    rowCount: status === "stale" ? 0 : rows.length,
  };
}

async function recordRefreshFailure(
  database: PricingDatabase,
  packageId: string,
  errorCode: string,
) {
  await Promise.all([
    database
      .from("package_pricing_refresh_queue")
      .update({
        processing_started_at: null,
        last_error_code: errorCode,
      })
      .eq("package_id", packageId),
    database
      .from("packages")
      .update({ pricing_status: "failed" })
      .eq("id", packageId),
  ]);
}

export async function processPackagePricingQueue(limit = 25) {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const database = adminDatabase();
  const { data, error } = await database.rpc("claim_package_pricing_refresh", {
    p_limit: safeLimit,
  });
  if (error) throw error;

  const jobs = (data ?? []) as Array<{ package_id: string }>;
  const results: PackagePricingRefreshResult[] = [];
  let failed = 0;
  const references = jobs.length
    ? await getPackageReferenceData(database)
    : undefined;

  for (const job of jobs) {
    try {
      await database
        .from("packages")
        .update({ pricing_status: "processing" })
        .eq("id", job.package_id);
      results.push(
        await rebuildPackagePricing(job.package_id, database, references),
      );
    } catch (refreshError) {
      failed += 1;
      await recordRefreshFailure(database, job.package_id, "calculation_failed");
      logServerError("package_pricing_refresh_failed", refreshError);
    }
  }

  return {
    claimed: jobs.length,
    completed: results.length,
    incomplete: results.filter((result) => result.status === "incomplete").length,
    stale: results.filter((result) => result.status === "stale").length,
    failed,
  };
}

/**
 * Package mutations should succeed even if the derived cache refresh is
 * temporarily unavailable. The database trigger leaves a retryable queue row.
 */
export async function refreshPackagePricingSafely(packageId: string) {
  try {
    return await rebuildPackagePricing(packageId);
  } catch (error) {
    logServerError("package_pricing_refresh_deferred", error);
    return null;
  }
}

/** Process a small batch immediately; the secured worker endpoint drains excess work. */
export async function processPackagePricingQueueSafely(limit = 25) {
  try {
    return await processPackagePricingQueue(limit);
  } catch (error) {
    logServerError("package_pricing_queue_deferred", error);
    return null;
  }
}
