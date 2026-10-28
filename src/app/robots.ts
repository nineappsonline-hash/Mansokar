import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: process.env.NEXT_PUBLIC_SUPABASE_URL ? "/" : undefined,
      disallow: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            "/admin",
            "/api/",
            "/ar/cart",
            "/en/cart",
            "/ar/checkout",
            "/en/checkout",
            "/ar/account",
            "/en/account",
            "/ar/garage",
            "/en/garage",
            "/ar/order/",
            "/en/order/",
            "/ar/compare",
            "/en/compare",
            "/ar/track-order",
            "/en/track-order",
          ]
        : "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
