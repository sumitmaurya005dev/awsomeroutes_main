import type { NextConfig } from "next";
import { validateServerEnvironment } from "./src/config/environment";

validateServerEnvironment();

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/custom-itineraries/*/pdf": ["./assets/fonts/NotoSans-Regular.ttf"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    const staticCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://ik.imagekit.io",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "upgrade-insecure-requests",
    ].join("; ");
    const securityHeaders = [
      { key: "Content-Security-Policy", value: staticCsp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/home/:path*", headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ] },
    ];
  },
};

export default nextConfig;
