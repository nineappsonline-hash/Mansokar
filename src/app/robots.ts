import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? ["/", "/api/merchant-feed"]
          : undefined,
        disallow: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? ["/admin", "/api/", "/auth/"]
          : "/",
      },
      ...(process.env.SEO_ALLOW_TRAINING_CRAWLERS === "true"
        ? []
        : [{ userAgent: ["GPTBot", "Google-Extended"], disallow: "/" }]),
    ],
    sitemap: siteOrigin() + "/sitemap.xml",
  };
}
