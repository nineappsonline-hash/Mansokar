import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";
import { sitemapPublished } from "@/lib/sitemap-visibility";
export default function robots(): MetadataRoute.Robots {
  const crawlEnabled = sitemapPublished();
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
