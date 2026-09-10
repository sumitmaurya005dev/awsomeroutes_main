import "server-only";

import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

type FeatureRateLimitOptions = {
  scope: string;
  subject: string;
  limit: number;
  windowSeconds: number;
};

export type FeatureRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * Atomically consumes one operation from a server-only database bucket.
 * Subjects are HMACed before storage so user IDs and IP addresses are never
 * persisted in the limiter table.
 */
export async function consumeFeatureRateLimit({
  scope,
  subject,
  limit,
  windowSeconds,
}: FeatureRateLimitOptions): Promise<FeatureRateLimitResult> {
  if (!/^[a-z0-9:_-]{1,80}$/.test(scope)) {
    throw new Error("Invalid rate-limit scope.");
  }
  if (!subject || !Number.isInteger(limit) || limit < 1 || limit > 10_000) {
    throw new Error("Invalid rate-limit configuration.");
  }
  if (
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    windowSeconds > 86_400
  ) {
    throw new Error("Invalid rate-limit window.");
  }

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Rate limiting is not configured.");

  const fingerprint = createHmac("sha256", secret)
    .update(`${scope}:${subject}`)
    .digest("hex");
  const { data, error } = await createAdminClient().rpc(
    "consume_feature_rate_limit",
    {
      p_scope: scope,
      p_fingerprint: fingerprint,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    },
  );
  if (error || !data) throw new Error("Rate-limit check failed.");

  const result = data as { allowed?: unknown; retry_after_seconds?: unknown };
  if (
    typeof result.allowed !== "boolean" ||
    typeof result.retry_after_seconds !== "number"
  ) {
    throw new Error("Rate-limit check returned an invalid result.");
  }
  return {
    allowed: result.allowed,
    retryAfterSeconds: Math.max(0, Math.ceil(result.retry_after_seconds)),
  };
}
