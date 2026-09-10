import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { processPackagePricingQueue } from "@/lib/packages/pricing-persistence";
import { logServerError } from "@/lib/security/log-server-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const configured = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;
  const configuredBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  return (
    configuredBytes.length === suppliedBytes.length &&
    timingSafeEqual(configuredBytes, suppliedBytes)
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processPackagePricingQueue(50);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const correlationId = crypto.randomUUID().replaceAll("-", "");
    logServerError("package_pricing_worker_failed", error, correlationId);
    return NextResponse.json(
      { error: "Pricing refresh failed.", correlationId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
