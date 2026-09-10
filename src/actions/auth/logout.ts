"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedSessionTokenMetadata } from "@/lib/auth/session-token";
import { logServerError } from "@/lib/security/log-server-error";
import { redirect } from "next/navigation";

export async function logoutAction() {
  const supabase = await createClient();

  // getUser() cryptographically verifies the token before any decoded claim is
  // trusted. The deny-list makes the current access token unusable immediately;
  // global sign-out separately revokes every refresh token for this account.
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const token = sessionData.session?.access_token;
  const metadata = token ? getVerifiedSessionTokenMetadata(token) : null;

  if (userData.user && metadata) {
    const admin = createAdminClient();
    const { error: revocationError } = await admin
      .from("revoked_auth_sessions")
      .upsert({
        session_id: metadata.sessionId,
        user_id: userData.user.id,
        expires_at: metadata.expiresAt.toISOString(),
      });
    if (revocationError) {
      logServerError("Session revocation failed.", revocationError);
      throw new Error("Could not sign out securely. Please try again.");
    }
  }

  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    throw new Error("Could not sign out. Please try again.");
  }

  redirect("/");
}
