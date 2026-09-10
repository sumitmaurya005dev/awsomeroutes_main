import { NextRequest, NextResponse } from "next/server";

const CORRELATION_ID_PATTERN = /^[0-9a-f]{32}$/;

export function createCorrelationId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function getCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.toLowerCase();
  return supplied && CORRELATION_ID_PATTERN.test(supplied)
    ? supplied
    : createCorrelationId();
}

export function contentSecurityPolicy(nonce: string) {
  const development = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://ik.imagekit.io",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function applyResponseSecurity(
  response: NextResponse,
  correlationId: string,
  csp: string,
) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Correlation-ID", correlationId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return response;
}

export function originIsAllowed(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  // Unsafe browser requests carry Origin. In production, fail closed when it is
  // absent so a non-browser client cannot bypass the CSRF origin boundary with
  // a stolen cookie. Health checks use GET and are unaffected.
  if (!origin) return process.env.NODE_ENV !== "production";
  if (
    process.env.NODE_ENV === "development" &&
    origin === request.nextUrl.origin
  ) {
    return true;
  }
  const configured = process.env.APP_ORIGIN;
  if (!configured) return false;

  try {
    return new URL(origin).origin === new URL(configured).origin;
  } catch {
    return false;
  }
}
