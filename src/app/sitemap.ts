import type { MetadataRoute } from "next";
import { searchPages } from "@/lib/seo-pages";
import { sitemapEntries } from "@/lib/seo-inventory";
// Refresh after catalog/CMS changes rather than retaining the build-time inventory.
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(
    await searchPages(),
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
}
