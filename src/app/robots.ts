import type { MetadataRoute } from "next";
import { indexingApproved, siteOrigin } from "@/lib/site-url";
export default function robots(): MetadataRoute.Robots {
  const crawlEnabled = indexingApproved() && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: crawlEnabled
          ? ["/", "/api/merchant-feed"]
          : undefined,
        disallow: crawlEnabled
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
