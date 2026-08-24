'use server';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;


  // Guard Clause to prevent empty validations
  if (!email || !password) {
    return { error: "Please enter both an email and password." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "active") {
    await supabase.auth.signOut();

    return {
      error:
        "Your account is inactive or is not configured for portal access. Please contact an administrator.",
    };
  }

  redirect("/home");
}
