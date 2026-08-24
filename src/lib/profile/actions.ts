"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const detailsSchema = z.object({
  phone: z.string().trim().max(30).nullable(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required.").max(128),
  password: z.string().min(8, "Password must contain at least 8 characters.").max(128),
}).refine((value) => value.current_password !== value.password, {
  path: ["password"],
  message: "New password must be different from the current password.",
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

  return error ? { success: false as const, error: error.message } : { success: true as const };
}

export async function changeOwnPassword(input: z.infer<typeof passwordSchema>) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Unauthorized." };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  if (!user.email) return { success: false as const, error: "Your account email could not be verified." };

  const supabase = await createClient();
  const verification = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (verification.error) {
    return { success: false as const, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  return error ? { success: false as const, error: error.message } : { success: true as const };
}
