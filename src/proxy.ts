import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // ========= PUBLIC ROUTES =========
  // These routes will only be accessable without login
  const publicRoutes = [
    "/",                  // Login
    "/forgot-password", // not yet implemented
    "/reset-password", // not yet implemented
  ];

  const isPublicRoute = publicRoutes.some((route) => {
    return pathname === route || pathname.startsWith(route + "/");
  });

  // ========= NOT LOGGED IN =========

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // A valid Supabase Auth session alone is not sufficient for this admin portal.
  // The corresponding profile must explicitly be active.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();

      if (pathname.startsWith("/api/")) {
        const apiResponse = NextResponse.json(
          { error: "Your account is inactive or does not have portal access." },
          { status: 403 }
        );

        response.cookies.getAll().forEach((cookie) => {
          apiResponse.cookies.set(cookie);
        });

        return apiResponse;
      }

      const loginResponse = NextResponse.redirect(new URL("/", request.url));

      response.cookies.getAll().forEach((cookie) => {
        loginResponse.cookies.set(cookie);
      });

      return loginResponse;
    }
  }

  // ========= ALREADY LOGGED IN =========

  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
