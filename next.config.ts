import type { NextConfig } from "next";

// Derive the API origin from configuration so Preview/staging projects work without editing CSP.
function supabaseOrigins(): string {
  const fallback = "https://rpfupihdsqxprhptxypv.supabase.co";
  let origin = fallback;
  try {
    origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || fallback).origin;
  } catch {
    origin = fallback;
  }
  const realtime = origin.replace(/^http/, "ws");
  return `${origin} ${realtime}`;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com https:",
  `connect-src 'self' ${supabaseOrigins()}`,
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
