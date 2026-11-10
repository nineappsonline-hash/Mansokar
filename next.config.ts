import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // Keep metadata in the initial HTML and preserve 404 status before streaming.
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            pathname: "/storage/v1/object/sign/catalog-images/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(process.env.STORE_LAUNCH_APPROVED === "true"
            ? []
            : [{ key: "X-Robots-Tag", value: "noindex, follow" }]),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NEXT_PUBLIC_GA4_ID ? "https://www.googletagmanager.com" : ""} ${process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'"}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://images.unsplash.com https://*.supabase.co http://127.0.0.1:54321; connect-src 'self' https://*.supabase.co ${process.env.NEXT_PUBLIC_GA4_ID ? "https://*.google-analytics.com https://www.googletagmanager.com" : ""}; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
