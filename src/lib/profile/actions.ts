"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteImageKitFile } from "@/lib/imagekit/server";
import { logServerError } from "@/lib/security/log-server-error";
import { consumeFeatureRateLimit } from "@/lib/security/feature-rate-limit";

const detailsSchema = z.object({
  phone: z.string().trim().max(30).nullable(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required.").max(128),
  password: z.string().min(12, "Password must contain at least 12 characters.").max(128)
    .regex(/[A-Za-z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
}).refine((value) => value.current_password !== value.password, {
  path: ["password"],
  message: "New password must be different from the current password.",
});

const deletionSchema = z.object({
  current_password: z.string().min(1).max(128),
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export async function updateOwnProfile(input: z.infer<typeof detailsSchema>) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Unauthorized." };

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid profile details." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({
    phone: parsed.data.phone || null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (error) {
    logServerError("Own profile update failed.", error);
    return { success: false as const, error: "Profile details could not be updated." };
  }
  return { success: true as const };
}

export async function changeOwnPassword(input: z.infer<typeof passwordSchema>) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Unauthorized." };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  if (!user.email) return { success: false as const, error: "Your account email could not be verified." };

  const quota = await consumeFeatureRateLimit({
    scope: "profile-password-change",
    subject: user.id,
    limit: 5,
    windowSeconds: 15 * 60,
  }).catch(() => null);
  if (!quota) return { success: false as const, error: "Password change is temporarily unavailable." };
  if (!quota.allowed) return { success: false as const, error: "Too many password-change attempts. Try again later." };

  const supabase = await createClient();
  const verification = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (verification.error) {
    return { success: false as const, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logServerError("Own password update failed.", error);
    return { success: false as const, error: "Password could not be changed." };
  }

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  return profileError ? { success: false as const, error: "Password changed, but account setup could not be completed. Contact an administrator." } : { success: true as const };
}

export async function deleteOwnAccount(input: z.infer<typeof deletionSchema>) {
  const parsed = deletionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: "Enter your current password and type DELETE MY ACCOUNT exactly.",
    };
  }

  const user = await getCurrentUser();
  if (!user?.email) return { success: false as const, error: "Unauthorized." };

  const quota = await consumeFeatureRateLimit({
    scope: "account-deletion-attempt",
    subject: user.id,
    limit: 5,
    windowSeconds: 15 * 60,
  }).catch(() => null);
  if (!quota) return { success: false as const, error: "Account deletion is temporarily unavailable." };
  if (!quota.allowed) return { success: false as const, error: "Too many account-deletion attempts. Try again later." };

  const supabase = await createClient();
  const verification = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verification.error) {
    return { success: false as const, error: "Current password is incorrect." };
  }

  const admin = createAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("role_id,role:roles(slug)")
    .eq("id", user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data) {
    logServerError("Account deletion profile lookup failed.", profileResult.error);
    return { success: false as const, error: "Account deletion could not be started." };
  }

  const role = profileResult.data.role as unknown as { slug?: string } | null;
  if (role?.slug === "super_admin" && profileResult.data.role_id) {
    const remaining = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role_id", profileResult.data.role_id)
      .eq("status", "active");
    if (remaining.error) {
      logServerError("Last administrator safety check failed.", remaining.error);
      return { success: false as const, error: "Account deletion safety check failed." };
    }
    if ((remaining.count ?? 0) <= 1) {
      return {
        success: false as const,
        error: "Create another active Super Admin before deleting this account.",
      };
    }
  }

  const avatarAssets = await admin
    .from("media_assets")
    .select("id,imagekit_file_id")
    .eq("uploaded_by", user.id)
    .eq("folder", "/awesomeroutes/profiles");
  if (avatarAssets.error) {
    logServerError("Account avatar inventory failed.", avatarAssets.error);
    return { success: false as const, error: "Account media could not be prepared for deletion." };
  }

  for (const asset of avatarAssets.data ?? []) {
    if (!(await deleteImageKitFile(asset.imagekit_file_id))) {
      return {
        success: false as const,
        error: "Profile media could not be removed. Please retry account deletion.",
      };
    }
  }

  if (avatarAssets.data?.length) {
    const mediaDelete = await admin
      .from("media_assets")
      .delete()
      .in("id", avatarAssets.data.map((asset) => asset.id));
    if (mediaDelete.error) {
      logServerError("Account avatar database cleanup failed.", mediaDelete.error);
      return { success: false as const, error: "Account media could not be removed." };
    }
  }

  const deletion = await admin.auth.admin.deleteUser(user.id);
  if (deletion.error) {
    logServerError("Supabase account deletion failed.", deletion.error);
    return {
      success: false as const,
      error: "Account could not be deleted. Ensure the latest privacy migration is applied.",
    };
  }

  await supabase.auth.signOut({ scope: "local" });
  return { success: true as const };
}
