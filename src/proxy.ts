import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getVerifiedSessionTokenMetadata } from "@/lib/auth/session-token";
import {
  applyResponseSecurity,
  contentSecurityPolicy,
  createCorrelationId,
  originIsAllowed,
} from "@/lib/security/request-security";

export async function proxy(request: NextRequest) {
  const correlationId = createCorrelationId();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const secure = (response: NextResponse) =>
    applyResponseSecurity(response, correlationId, csp);

  if (!originIsAllowed(request)) {
    return secure(
      NextResponse.json(
        {
          error: "The request origin is not allowed.",
          correlationId,
        },
        { status: 403 },
      ),
    );
  }

  const { response, user, supabase } = await updateSession(
    request,
    requestHeaders,
  );

  const pathname = request.nextUrl.pathname;

  // ========= PUBLIC ROUTES =========
  // These routes will only be accessable without login
  const publicRoutes = ["/", "/api/health"];
  const isLoginRoute = pathname === "/";

  const isPublicRoute = publicRoutes.some((route) => {
    return pathname === route || pathname.startsWith(route + "/");
  });

  // ========= NOT LOGGED IN =========

  if (!user && !isPublicRoute) {
    return secure(NextResponse.redirect(new URL("/", request.url)));
  }

  // A valid Supabase Auth session alone is not sufficient for this admin portal.
  // The corresponding profile must explicitly be active.
  if (user) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const metadata = token ? getVerifiedSessionTokenMetadata(token) : null;

    // The user was already verified by auth.getUser() in updateSession. Reject
    // malformed/legacy session tokens and tokens explicitly revoked on logout.
    const revocation = metadata
      ? await supabase.rpc("is_auth_session_revoked", {
          p_session_id: metadata.sessionId,
        })
      : { data: true, error: null };
    if (revocation.error || revocation.data) {
      await supabase.auth.signOut({ scope: "local" });
      const revokedResponse = pathname.startsWith("/api/")
        ? NextResponse.json(
            { error: "Your session is no longer valid.", correlationId },
            { status: 401 },
          )
        : NextResponse.redirect(new URL("/", request.url));
      response.cookies.getAll().forEach((cookie) => revokedResponse.cookies.set(cookie));
      return secure(revokedResponse);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("status,must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();

      if (pathname.startsWith("/api/")) {
        const apiResponse = NextResponse.json(
          {
            error: "Your account is inactive or does not have portal access.",
            correlationId,
          },
          { status: 403 }
        );

        response.cookies.getAll().forEach((cookie) => {
          apiResponse.cookies.set(cookie);
        });

        return secure(apiResponse);
      }

      const loginResponse = NextResponse.redirect(new URL("/", request.url));

      response.cookies.getAll().forEach((cookie) => {
        loginResponse.cookies.set(cookie);
      });

      return secure(loginResponse);
    }

    const isPasswordChangeRoute = pathname === "/home/profile" || pathname.startsWith("/api/profile/");
    if (profile.must_change_password && !isPasswordChangeRoute) {
      if (pathname.startsWith("/api/")) {
        return secure(
          NextResponse.json(
            {
              error: "You must change your temporary password before continuing.",
              correlationId,
            },
            { status: 403 },
          ),
        );
      }
      const passwordResponse = NextResponse.redirect(new URL("/home/profile?passwordChange=required", request.url));
      response.cookies.getAll().forEach((cookie) => passwordResponse.cookies.set(cookie));
      return secure(passwordResponse);
    }
  }

  // ========= ALREADY LOGGED IN =========

  if (user && isLoginRoute) {
    return secure(NextResponse.redirect(new URL("/home", request.url)));
  }

  return secure(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
