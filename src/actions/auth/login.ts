'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHmac } from "node:crypto";
import { createCorrelationId } from "@/lib/security/request-security";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const correlationId =
    requestHeaders.get("x-correlation-id") ?? createCorrelationId();
  const failure = (error: string) => ({ error, correlationId });

  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 128);


  // Guard Clause to prevent empty validations
  if (!email || !password) {
    return failure("Please enter both an email and password.");
  }

  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const fingerprintKey = process.env.SUPABASE_SECRET_KEY;
  if (!fingerprintKey) {
    return failure("Login is temporarily unavailable. Please try again shortly.");
  }
  // The bucket is deliberately IP-only so rotating email addresses cannot
  // bypass the five-attempt window. The raw IP is never persisted.
  const fingerprint = createHmac("sha256", fingerprintKey)
    .update(`login:${ipAddress}`)
    .digest("hex");
  const admin = createAdminClient();
  const blockResult = await admin.rpc("get_login_block_seconds", { p_fingerprint: fingerprint });
  if (blockResult.error) return failure("Login is temporarily unavailable. Please try again shortly.");
  if ((blockResult.data ?? 0) > 0) {
    const minutes = Math.max(1, Math.ceil((blockResult.data ?? 0) / 60));
    return failure(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await admin.rpc("record_login_attempt", { p_fingerprint: fingerprint, p_succeeded: false });
    return failure("Invalid email or password.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    await admin.rpc("record_login_attempt", { p_fingerprint: fingerprint, p_succeeded: false });

    return failure(
      "Your account is inactive or is not configured for portal access. Please contact an administrator.",
    );
  }

  await admin.rpc("record_login_attempt", { p_fingerprint: fingerprint, p_succeeded: true });

  redirect("/home");
}
