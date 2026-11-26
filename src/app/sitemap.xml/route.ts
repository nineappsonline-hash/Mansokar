import { siteOrigin } from "@/lib/site-url";
import { sitemapPublished } from "@/lib/sitemap-visibility";
import { sitemapIndex } from "@/lib/sitemap-xml";
export const dynamic = "force-dynamic";
export function GET() {
  if (!sitemapPublished()) return new Response(null, { status: 404 });
  return new Response(sitemapIndex(siteOrigin()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
