import { siteOrigin } from "@/lib/site-url";
import { sitemapIndex } from "@/lib/sitemap-xml";
export const dynamic = "force-dynamic";
export function GET() {
  return new Response(sitemapIndex(siteOrigin()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
