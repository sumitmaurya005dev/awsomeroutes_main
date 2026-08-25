'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "");


  // Guard Clause to prevent empty validations
  if (!email || !password) {
    return { error: "Please enter both an email and password." };
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const fingerprint = createHash("sha256").update(`${ipAddress}|${email}`).digest("hex");
  const admin = createAdminClient();
  const blockResult = await admin.rpc("get_login_block_seconds", { p_fingerprint: fingerprint });
  if (blockResult.error) return { error: "Login is temporarily unavailable. Please try again shortly." };
  if ((blockResult.data ?? 0) > 0) {
    const minutes = Math.max(1, Math.ceil((blockResult.data ?? 0) / 60));
    return { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await admin.rpc("record_login_attempt", { p_fingerprint: fingerprint, p_succeeded: false });
    return { error: "Invalid email or password." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    await admin.rpc("record_login_attempt", { p_fingerprint: fingerprint, p_succeeded: false });

    return {
      error:
        "Your account is inactive or is not configured for portal access. Please contact an administrator.",
    };
  }

  await admin.rpc("record_login_attempt", { p_fingerprint: fingerprint, p_succeeded: true });

  redirect("/home");
}
