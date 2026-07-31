import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

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